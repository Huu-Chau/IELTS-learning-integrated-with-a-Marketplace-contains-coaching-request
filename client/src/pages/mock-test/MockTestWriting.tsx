/**
 * MockTestWriting.tsx
 * 
 * Mock Test > Writing — lists test sets (Cambridge 20, 19, 18…)
 * Each set has 4 Writing tests. Source materials will be added later.
 */
import MockTestSkillList, { MockTestSet } from './MockTestSkillList';

// ── Placeholder test sets — replace with real data once materials are provided ─
const TEST_SETS: MockTestSet[] = [
    {
        id: 'cambridge-20',
        name: 'Cambridge IELTS 20',
        tests: [
            { testNumber: 1 },
            { testNumber: 2 },
            { testNumber: 3 },
            { testNumber: 4 },
        ],
    },
    {
        id: 'cambridge-19',
        name: 'Cambridge IELTS 19',
        tests: [
            { testNumber: 1 },
            { testNumber: 2 },
            { testNumber: 3 },
            { testNumber: 4 },
        ],
    },
    {
        id: 'cambridge-18',
        name: 'Cambridge IELTS 18',
        tests: [
            { testNumber: 1 },
            { testNumber: 2 },
            { testNumber: 3 },
            { testNumber: 4 },
        ],
    },
];

export default function MockTestWriting() {
    return (
        <MockTestSkillList
            skill="Writing"
            accentColor="rose"
            sessionPrefix="/mock-test/writing/session"
            testSets={TEST_SETS}
        />
    );
}
