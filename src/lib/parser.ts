import { z } from 'zod';
import { Question, QuestionType, PointsMode } from '../types/quiz';

export const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['quiz', 'truefalse']),
  text: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(z.string()).min(2, 'At least 2 options are required'),
  correctAnswers: z.array(z.number()).min(1, 'At least 1 correct answer must be specified'),
  timeLimit: z.number().int().min(5).max(120).default(20),
  pointsMode: z.enum(['standard', 'double', 'none']).default('standard'),
  imageUrl: z.string().optional(),
  explanation: z.string().optional(),
});

export const QuizImportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).min(1, 'At least one valid question is required'),
});

export interface ParseIssue {
  questionNumber: number;
  line?: number;
  message: string;
  level: 'error' | 'warning';
}

export interface ParseResult {
  title?: string;
  questions: Question[];
  issues: ParseIssue[];
  rawText: string;
}

// Clean curly quotes and code blocks
function cleanRawString(str: string): string {
  return str
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

// Normalize true/false string
function parseBooleanString(val: string): boolean | null {
  const clean = val.trim().toLowerCase();
  if (['true', 't', 'rost', 'pravda', 'правда', 'верно', 'ha', 'да'].includes(clean)) {
    return true;
  }
  if (['false', 'f', 'yolg\'on', 'yolgon', 'ложь', 'неверно', 'yo\'q', 'нет'].includes(clean)) {
    return false;
  }
  return null;
}

export function parseImportContent(rawInput: string): ParseResult {
  const issues: ParseIssue[] = [];
  const cleaned = cleanRawString(rawInput);

  if (!cleaned) {
    return { questions: [], issues: [{ questionNumber: 0, message: 'Input is empty', level: 'error' }], rawText: rawInput };
  }

  // Attempt FORMAT 2: JSON
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(cleaned);
      let rawQuestions: unknown[] = [];
      let detectedTitle: string | undefined;

      if (Array.isArray(parsedJson)) {
        rawQuestions = parsedJson;
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        if ('title' in parsedJson && typeof parsedJson.title === 'string') {
          detectedTitle = parsedJson.title;
        }
        if ('questions' in parsedJson && Array.isArray(parsedJson.questions)) {
          rawQuestions = parsedJson.questions;
        }
      }

      if (rawQuestions.length > 0) {
        const questions: Question[] = [];

        rawQuestions.forEach((qObj, idx) => {
          const q = qObj as Record<string, unknown>;
          const qNum = idx + 1;
          const type: QuestionType = (q.type === 'truefalse' ? 'truefalse' : 'quiz');
          const text = String(q.text || q.question || '').trim();
          
          let options: string[] = [];
          if (type === 'truefalse') {
            options = ['True', 'False'];
          } else if (Array.isArray(q.options)) {
            options = q.options.map((opt) => String(opt).trim());
          }

          let correctAnswers: number[] = [];
          if (Array.isArray(q.correct)) {
            correctAnswers = q.correct.map(Number).filter((n) => !isNaN(n));
          } else if (Array.isArray(q.correctAnswers)) {
            correctAnswers = q.correctAnswers.map(Number).filter((n) => !isNaN(n));
          } else if (typeof q.correct === 'number') {
            correctAnswers = [q.correct];
          } else if (typeof q.answer === 'string') {
            const letter = q.answer.trim().toUpperCase();
            const letterIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
            if (letterIdx >= 0) {
              correctAnswers = [letterIdx];
            } else {
              const bool = parseBooleanString(q.answer);
              if (bool !== null) {
                correctAnswers = [bool ? 0 : 1];
              }
            }
          }

          const timeLimit = typeof q.time === 'number' ? q.time : (typeof q.timeLimit === 'number' ? q.timeLimit : 20);
          const pointsMode: PointsMode = (q.points === 'double' || q.pointsMode === 'double') ? 'double' : (q.points === 'none' || q.pointsMode === 'none') ? 'none' : 'standard';

          const questionItem: Question = {
            id: `imported-${Date.now()}-${idx}`,
            type,
            text,
            options,
            correctAnswers,
            timeLimit,
            pointsMode,
            imageUrl: typeof q.imageUrl === 'string' ? q.imageUrl : undefined,
          };

          const validation = QuestionSchema.safeParse(questionItem);
          if (!validation.success) {
            validation.error.issues.forEach((err) => {
              issues.push({
                questionNumber: qNum,
                message: `${err.path.join('.')}: ${err.message}`,
                level: 'error',
              });
            });
          }

          questions.push(questionItem);
        });

        return {
          title: detectedTitle,
          questions,
          issues,
          rawText: rawInput,
        };
      }
    } catch {
      // If JSON parse fails, fall through to Plain Text parsing
    }
  }

  // FORMAT 1: Plain Text (Line by Line block parsing)
  const lines = cleaned.split('\n');
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Detect start of new question: Q:, Q1:, 1., 1), Question:
    const isQuestionStart = /^(?:Q\d*[:.]|\d+[\).]|Question\s*\d*[:.]|Savol\s*\d*[:.]|Вопрос\s*\d*[:.])/i.test(line);

    if (isQuestionStart && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else if (line.length > 0) {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const questions: Question[] = [];

  blocks.forEach((block, bIdx) => {
    const qNum = bIdx + 1;
    let questionText = '';
    let questionType: QuestionType = 'quiz';
    const optionsMap: { [key: string]: string } = {};
    let answerIndicator = '';
    let timeLimit = 20;
    let pointsMode: PointsMode = 'standard';
    let imageUrl: string | undefined;

    block.forEach((line) => {
      // Clean leading markdown asterisks
      const stripped = line.replace(/^\*+|\*+$/g, '').trim();

      // Check Question line
      const qMatch = stripped.match(/^(?:Q\d*[:.]|\d+[\).]|Question\s*\d*[:.]|Savol\s*\d*[:.]|Вопрос\s*\d*[:.])\s*(.*)$/i);
      if (qMatch && !questionText) {
        questionText = qMatch[1].trim();
        return;
      }

      // Check Type line
      const typeMatch = stripped.match(/^Type[:.\s]+(quiz|truefalse|true\/false|tf)/i);
      if (typeMatch) {
        const val = typeMatch[1].toLowerCase();
        questionType = val.includes('true') || val === 'tf' ? 'truefalse' : 'quiz';
        return;
      }

      // Check Option lines: A) text, A. text, [A] text
      const optMatch = stripped.match(/^([A-D])[\).\]:]\s*(.*)$/i);
      if (optMatch) {
        const letter = optMatch[1].toUpperCase();
        optionsMap[letter] = optMatch[2].trim();
        return;
      }

      // Check Answer line: Answer:, Correct:, Javob:, To'g'ri:, Ответ:
      const ansMatch = stripped.match(/^(?:Answer|Correct|Javob|To'?g'?ri|Ответ)[:.\s]+(.*)$/i);
      if (ansMatch) {
        answerIndicator = ansMatch[1].trim();
        return;
      }

      // Check Time line
      const timeMatch = stripped.match(/^(?:Time|Vaqt|Время)[:.\s]+(\d+)/i);
      if (timeMatch) {
        timeLimit = parseInt(timeMatch[1], 10) || 20;
        return;
      }

      // Check Points line
      const pointsMatch = stripped.match(/^(?:Points|Ball|Баллы)[:.\s]+(standard|double|none|2000|1000|0)/i);
      if (pointsMatch) {
        const pVal = pointsMatch[1].toLowerCase();
        if (pVal === 'double' || pVal === '2000') pointsMode = 'double';
        else if (pVal === 'none' || pVal === '0') pointsMode = 'none';
        else pointsMode = 'standard';
        return;
      }

      // Check Image URL
      const imgMatch = stripped.match(/^(?:Image|Rasm|Обложка)[:.\s]+(https?:\/\/\S+)/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
        return;
      }

      // If question text wasn't prefixed by Q:
      if (!questionText) {
        questionText = stripped;
      }
    });

    // Auto-detect True/False if not explicitly set
    const booleanAns = parseBooleanString(answerIndicator);
    if (booleanAns !== null && Object.keys(optionsMap).length === 0) {
      questionType = 'truefalse';
    }

    let finalOptions: string[] = [];
    let correctAnswers: number[] = [];

    if (questionType === 'truefalse') {
      finalOptions = ['True', 'False'];
      if (booleanAns !== null) {
        correctAnswers = [booleanAns ? 0 : 1];
      } else {
        issues.push({
          questionNumber: qNum,
          message: `Could not identify True/False answer from "${answerIndicator}"`,
          level: 'error',
        });
      }
    } else {
      const letters = ['A', 'B', 'C', 'D'];
      letters.forEach((l) => {
        if (optionsMap[l]) finalOptions.push(optionsMap[l]);
      });

      if (finalOptions.length < 2) {
        issues.push({
          questionNumber: qNum,
          message: `Only found ${finalOptions.length} options. Minimum 2 options required.`,
          level: 'error',
        });
      }

      const letterTarget = answerIndicator.toUpperCase().trim();
      const ansIdx = letters.indexOf(letterTarget);
      if (ansIdx >= 0 && ansIdx < finalOptions.length) {
        correctAnswers = [ansIdx];
      } else if (finalOptions.length > 0) {
        // Look if the answer matches text of an option
        const textMatchIdx = finalOptions.findIndex((opt) => opt.toLowerCase() === answerIndicator.toLowerCase());
        if (textMatchIdx >= 0) {
          correctAnswers = [textMatchIdx];
        } else {
          issues.push({
            questionNumber: qNum,
            message: `Could not determine correct option for "${answerIndicator}". Marked option A as default.`,
            level: 'warning',
          });
          correctAnswers = [0];
        }
      }
    }

    const item: Question = {
      id: `imported-${Date.now()}-${bIdx}`,
      type: questionType,
      text: questionText,
      options: finalOptions,
      correctAnswers: correctAnswers.length > 0 ? correctAnswers : [0],
      timeLimit,
      pointsMode,
      imageUrl,
    };

    const validated = QuestionSchema.safeParse(item);
    if (!validated.success) {
      validated.error.issues.forEach((vErr) => {
        issues.push({
          questionNumber: qNum,
          message: `${vErr.path.join('.')}: ${vErr.message}`,
          level: 'error',
        });
      });
    }

    questions.push(item);
  });

  return {
    questions,
    issues,
    rawText: rawInput,
  };
}

export function generatePromptTemplate(
  topic: string,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard',
  language: string
): string {
  return `Generate a ${count}-question quiz on the topic "${topic || 'General Science & History'}" suitable for a live Kahoot game.
Difficulty level: ${difficulty}.
Language: ${language}.

Format your response in plain text using EXACTLY this repeatable structure for each question:

Q: [Question text here]
Type: quiz
A) [First option]
B) [Second option]
C) [Third option]
D) [Fourth option]
Answer: [A, B, C, or D]
Time: 20
Points: standard

You may also include True/False questions in this structure:
Q: [Statement here]
Type: truefalse
Answer: [True or False]
Time: 10
Points: standard

Please provide clear, engaging, high-quality questions without extra conversational commentary.`;
}
