/**
 * QuestionSectionCard.tsx
 *
 * Wrapper card that renders instruction badge + instruction text,
 * then delegates to the correct question component based on answer_type.
 */
import { Component, ReactNode } from 'react';
import type { SubSection, AnswerMap } from '@/types/questionTypes';

// ── Per-card error boundary ───────────────────────────────────────────────────
class CardErrorBoundary extends Component<
    { label: string; children: ReactNode },
    { error: Error | null }
> {
    constructor(props: { label: string; children: ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error: Error) { return { error }; }
    render() {
        if (this.state.error) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-600 mb-4">
                    <strong>Render error in {this.props.label}:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error.message}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}


import TrueFalseNotGiven from './TrueFalseNotGiven';
import MultipleChoice from './MultipleChoice';
import MultipleChoiceMultiple from './MultipleChoiceMultiple';
import NoteCompletion from './NoteCompletion';
import TableCompletion from './TableCompletion';
import MatchingDropdown from './MatchingDropdown';
import MatchingSentenceEndings from './MatchingSentenceEndings';
import SummaryCompletion from './SummaryCompletion';
import SummaryCompletionOptions from './SummaryCompletionOptions';

interface QuestionSectionCardProps {
    subSection: SubSection;
    answers: AnswerMap;
    onAnswer: (questionNumber: number, value: string) => void;
}

/**
 * Maps answer_type / question_type to a human-readable label
 */
function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
        'true_false_not_given': 'True / False / Not Given',
        'yes_no_not_given': 'Yes / No / Not Given',
        'multiple_choice': 'Multiple Choice',
        'multiple_choice_multiple': 'Multiple Select',
        'note_completion': 'Note Completion',
        'table_completion': 'Table Completion',
        'matching': 'Matching',
        'matching_information': 'Matching Information',
        'matching_features': 'Matching Features',
        'matching_paragraph': 'Matching Paragraphs',
        'matching_sentence_endings': 'Matching Sentence Endings',
        'summary_completion': 'Summary Completion',
        'summary_completion_options': 'Summary Completion',
        'sentence_completion': 'Sentence Completion',
    };
    return map[type] ?? type.replace(/_/g, ' ');
}

export default function QuestionSectionCard({ subSection, answers, onAnswer }: QuestionSectionCardProps) {
    // Determine the question type from either sub-section level or first question
    const qType =
        subSection.answer_type ??
        subSection.question_type ??
        subSection.questions?.[0]?.answer_type ??
        'unknown';

    console.log('[QuestionSectionCard] render', { qType, range: subSection.questions_range });

    const props = { subSection, answers, onAnswer };

    const renderComponent = () => {
        switch (qType) {
            case 'true_false_not_given':
                return <TrueFalseNotGiven {...props} variant="tfng" />;
            case 'yes_no_not_given':
                return <TrueFalseNotGiven {...props} variant="ynng" />;
            case 'multiple_choice':
                return <MultipleChoice {...props} />;
            case 'multiple_choice_multiple':
                return <MultipleChoiceMultiple {...props} />;
            case 'note_completion':
                return <NoteCompletion {...props} />;
            case 'table_completion':
                return <TableCompletion {...props} />;
            case 'matching':
            case 'matching_information':
            case 'matching_features':
            case 'matching_paragraph':
                return <MatchingDropdown {...props} />;
            case 'matching_sentence_endings':
                return <MatchingSentenceEndings {...props} />;
            case 'summary_completion':
            case 'sentence_completion':
                return <SummaryCompletion {...props} />;
            case 'summary_completion_options':
                return <SummaryCompletionOptions {...props} />;
            default:
                return (
                    <div className="text-sm text-gray-400 italic p-3 bg-gray-50 rounded-lg">
                        Unsupported question type: {qType}
                    </div>
                );
        }
    };

    return (
        <CardErrorBoundary label={`${qType} Q${subSection.questions_range ?? '?'}`}>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
                {/* Type badge + question range */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {getTypeLabel(qType)}
                    </span>
                    {subSection.questions_range && (
                        <span className="text-[10px] text-gray-400">
                            Q {subSection.questions_range}
                        </span>
                    )}
                </div>

                {/* Instruction text */}
                {subSection.instructions && (
                    <div
                        className="text-xs text-gray-500 leading-relaxed bg-gray-50 px-3 py-2 rounded-lg border-l-2 border-gray-300 mb-4"
                        dangerouslySetInnerHTML={{ __html: subSection.instructions }}
                    />
                )}

                {renderComponent()}
            </div>
        </CardErrorBoundary>
    );
}
