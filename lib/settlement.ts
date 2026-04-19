export type Expense = {
  id: string;
  amount: number;
  paid_by_member_id: string;
  participants: string[];
};

export function calculateSettlement(
  members: { id: string; name: string }[],
  expenses: Expense[]
) {
  const balance: Record<string, number> = {};

  members.forEach((m) => {
    balance[m.id] = 0;
  });

  expenses.forEach((exp) => {
    const participantCount = exp.participants.length;
    if (participantCount === 0) return;

    const share = exp.amount / participantCount;

    exp.participants.forEach((memberId) => {
      balance[memberId] -= share;
    });

    balance[exp.paid_by_member_id] += exp.amount;
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  Object.entries(balance).forEach(([id, amt]) => {
    if (amt > 0) creditors.push({ id, amount: amt });
    if (amt < 0) debtors.push({ id, amount: -amt });
  });

  const settlements: {
    from: string;
    to: string;
    amount: number;
  }[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount),
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 1) i++;
    if (creditor.amount < 1) j++;
  }

  return { balance, settlements };
}