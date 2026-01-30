export type ConceptConditionDraft = {
  concept: {
    id: string;
    name: string;
    definition?: string;
    version?: number;
    hasChildren: boolean;
  };
  scope: {
    mode: "SELF" | "DESCENDANT" | "PARTIAL_DESCENDANT";
    selectedChildIds?: string[];
    selectedChildNames?: string[];
  };
  location: {
    inBody: boolean;
    inTitle: boolean;
    inParagraph: boolean;
    inSentence: boolean;
  };
  explainPreview: string;
  validation: {
    valid: boolean;
    errors?: string[];
  };
};
