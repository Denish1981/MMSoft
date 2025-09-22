export interface HistoryItem {
  id: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedByUser: string;
  changedAt: string; // ISO String
}

export interface ArchivedItem {
    id: number;
    name: string;
    type: string;
    deletedAt: string;
}
