import { MasteryLevel } from "./VocabularyEnums";

export class AddVocabularyPayload {
    constructor(
        readonly word: string,
        readonly englishMeaning?: string,
        readonly vietnameseMeaning?: string,
        readonly ipaSpelling?: string
    ) { }
}

export class UpdateVocabularyPayload {
    constructor(
        readonly word?: string,
        readonly englishMeaning?: string,
        readonly vietnameseMeaning?: string,
        readonly ipaSpelling?: string,
        readonly masteryLevel?: MasteryLevel
    ) { }
}
