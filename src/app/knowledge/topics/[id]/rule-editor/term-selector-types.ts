export interface TermSearchResult {
  id: string;
  name: string;
  definition?: string;
  parentName?: string;
  childCount?: number;
  hasChildren?: boolean;
  tags?: string[];
}

export interface SelectedTerm {
  conceptId: string;
  conceptName: string;
  includeDescendants: boolean;
}

