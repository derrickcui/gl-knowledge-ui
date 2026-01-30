export type TopicConditionLocation = {
  inBody: boolean;
  inTitle: boolean;
  inParagraph: boolean;
  inSentence: boolean;
};

export type TopicConditionDraft = {
  topic: {
    id: string;
    name: string;
    status?: string;
    version?: string | number;
  };
  location: TopicConditionLocation;
  rangeMode: "ALL" | "LIMITED";
  useOriginalRule?: boolean;
  explainPreview: string;
  validation: {
    valid: boolean;
    errors?: string[];
  };
};
