export type Category = '食事' | '交通' | 'グッズ' | 'その他';

export type EventRow = {
  id: string;
  title: string;
  event_date: string | null;
  created_at: string;
};

export type MemberRow = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  event_id: string;
  paid_by_member_id: string;
  amount: number;
  category: Category;
  memo: string | null;
  created_at: string;
};

export type ExpenseParticipantRow = {
  id: string;
  expense_id: string;
  member_id: string;
};

export type ExpenseWithParticipants = ExpenseRow & {
  participants: ExpenseParticipantRow[];
};
