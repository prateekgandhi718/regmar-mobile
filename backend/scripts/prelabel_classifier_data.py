"""
Prelabel classifier data using heuristics.

For manual labeling, this script provides a quick starting point using keywords.
You can then review and correct these labels before training.

Heuristics:
  - If email contains transaction-indicating keywords (debit, credit, amount, Rs, ₹, etc.) → likely 1 (transaction)
  - If email contains non-transaction keywords (balance, limit, rate, card, etc.) → likely 0 (non-transaction)
  
Usage:
    python scripts/prelabel_classifier_data.py ml_data/classifier_raw_emails.jsonl ml_data/classifier_labeled.jsonl
"""

import json
import sys
from pathlib import Path

# Heuristic keywords for transaction vs non-transaction emails
TXN_KEYWORDS = {
    'debited', 'debit', 'credited', 'credit', 'transferred', 'transfer',
    'amount', 'transaction', 'payment', 'paid', 'spent', 'received', 'deposit',
    'upi', 'neft', 'rtgs', 'merchant', 'vpa', 'reference number', 'reference no', 'txn ref', 'ref no',
}

NON_TXN_KEYWORDS = {
    'balance', 'available balance', 'current balance',
    'limit', 'credit limit', 'available limit',
    'rate', 'interest rate', 'apr',
    'card', 'account number', 'customer care',
    'issue', 'problem', 'issue resolved',
    'reward', 'cashback', 'bonus', 'promotion',
    'statement', 'monthly statement',
}

def prelabel_email(email_body: str) -> int:
    """
    Heuristic labeling: return 1 for transaction, 0 for non-transaction.
    this is unreliable so make sure to check manually after this creates the labels.
    """
    body_lower = email_body.lower()
    
    txn_count = sum(1 for kw in TXN_KEYWORDS if kw in body_lower)
    non_txn_count = sum(1 for kw in NON_TXN_KEYWORDS if kw in body_lower)
    
    # If transaction keywords outnumber non-transaction keywords, label as 1
    if txn_count > non_txn_count:
        return 1
    elif non_txn_count > txn_count:
        return 0
    else:
        # Default: if unsure, assume transaction (1)
        return 1

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'classifier_labeled.jsonl'
    
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    # Ensure output directory exists
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    labeled_count = 0
    with open(input_path, 'r') as infile, open(output_path, 'w') as outfile:
        for line in infile:
            record = json.loads(line.strip())
            record['label'] = prelabel_email(record['emailBody'])
            outfile.write(json.dumps(record) + '\n')
            labeled_count += 1
    
    print(f"✓ Prelabeled {labeled_count} emails")
    print(f"✓ Saved to: {output_path}")
    print(f"\nReview and correct labels before training.")

if __name__ == '__main__':
    main()
