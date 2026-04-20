/**
 * Writing Question Bank — IELTS Writing Part 1 & Part 2 Tasks
 *
 * Ported from Gemma_W/src/question_bank.ts.
 * Contains sample tasks that are randomly selected at runtime.
 */

import { WritingTask } from '../types/ai-types';

// ─── Part 1: Data Interpretation Tasks ──────────────────────────────────────

const PART1_TASKS: WritingTask[] = [
    {
        part: 'part1',
        taskType: 'Line Graph',
        prompt:
            'The graph below shows the number of international students enrolled in three different countries from 2000 to 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        dataDescription: `Line Graph Data:
  Year  |  USA     |  UK      |  Australia
  2000  |  500,000 |  200,000 |  150,000
  2005  |  580,000 |  280,000 |  200,000
  2010  |  700,000 |  400,000 |  280,000
  2015  |  900,000 |  430,000 |  300,000
  2020  |  1,100,000| 500,000 |  450,000

Key observations:
- All three countries showed upward trends throughout the period.
- The USA consistently had the highest numbers.
- Australia saw the steepest relative growth (tripled).`,
    },
    {
        part: 'part1',
        taskType: 'Bar Chart',
        prompt:
            'The chart below shows the percentage of household income spent on different categories in two countries in 2022.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        dataDescription: `Bar Chart Data — Household Spending (% of income), 2022:
  Category        |  Country A  |  Country B
  Housing          |  30%        |  22%
  Food             |  15%        |  28%
  Transport        |  18%        |  12%
  Healthcare       |  10%        |   8%
  Education        |   8%        |  14%
  Entertainment    |  12%        |   6%
  Other            |   7%        |  10%

Key observations:
- Country A spent the most on housing (30%), while Country B spent the most on food (28%).
- Transport and entertainment were higher in Country A.
- Country B prioritised food and education more heavily.`,
    },
    {
        part: 'part1',
        taskType: 'Pie Chart',
        prompt:
            'The pie charts below show the main reasons why students chose to study at a particular university in 2005 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        dataDescription: `Pie Chart Data — Reasons for University Choice:

  2005:                          2020:
  Reputation:     35%            Reputation:     25%
  Course Content: 25%            Course Content: 20%
  Location:       20%            Job Prospects:  30%
  Cost:           15%            Online Options: 15%
  Other:            5%           Cost:            5%
                                 Other:           5%

Key observations:
- In 2005, reputation was the dominant factor (35%); by 2020, job prospects led (30%).
- "Online options" emerged as a new category in 2020 (15%).
- Cost became less important over the period (15% → 5%).`,
    },
    {
        part: 'part1',
        taskType: 'Table',
        prompt:
            'The table below shows the proportion of people using four different types of transport to commute to work in three cities.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        dataDescription: `Table Data — Commuting Transport (% of workers):
  Transport   |  London  |  Tokyo   |  New York
  Car          |   25%    |   12%    |   30%
  Bus          |   20%    |   15%    |   25%
  Train/Metro  |   40%    |   55%    |   35%
  Cycling      |   15%    |   18%    |   10%

Key observations:
- Train/metro was the most popular mode in all three cities.
- Tokyo had the highest train/metro usage (55%) and lowest car usage (12%).
- New York relied most on cars (30%) and buses (25%).
- Cycling was most popular in Tokyo (18%) and least in New York (10%).`,
    },
];

// ─── Part 2: Essay Tasks ─────────────────────────────────────────────────────

const PART2_TASKS: WritingTask[] = [
    {
        part: 'part2',
        taskType: 'Opinion Essay',
        prompt:
            'Some people believe that universities should focus on providing academic skills, while others think they should prepare students for employment.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.',
    },
    {
        part: 'part2',
        taskType: 'Problem & Solution',
        prompt:
            'In many countries, the gap between the rich and the poor is increasing. What problems does this cause? What solutions can be implemented to address this issue?\n\nWrite at least 250 words.',
    },
    {
        part: 'part2',
        taskType: 'Discussion Essay',
        prompt:
            'Some people think that the best way to reduce crime is to give longer prison sentences. Others believe that there are better alternative ways of reducing crime.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.',
    },
    {
        part: 'part2',
        taskType: 'Advantages & Disadvantages',
        prompt:
            'Many people now work from home rather than travelling to a workplace every day. What are the advantages and disadvantages of working from home?\n\nWrite at least 250 words.',
    },
    {
        part: 'part2',
        taskType: 'Opinion Essay',
        prompt:
            'Some people believe that artificial intelligence will replace most human jobs in the near future. To what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/** Pick a random Part 1 task. */
export function getRandomPart1Task(): WritingTask {
    console.log('[WritingQuestionBank] getRandomPart1Task called');
    const task = PART1_TASKS[Math.floor(Math.random() * PART1_TASKS.length)];
    console.log('[WritingQuestionBank] getRandomPart1Task success', { taskType: task.taskType });
    return task;
}

/** Pick a random Part 2 task. */
export function getRandomPart2Task(): WritingTask {
    console.log('[WritingQuestionBank] getRandomPart2Task called');
    const task = PART2_TASKS[Math.floor(Math.random() * PART2_TASKS.length)];
    console.log('[WritingQuestionBank] getRandomPart2Task success', { taskType: task.taskType });
    return task;
}
