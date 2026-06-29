"""
Extract transaction emails from the classifier data and prepare type classifier dataset.

This script filters the existing classifier_labeled.jsonl to keep only emails labeled as
transactions (label=1), then adds heuristic labels for debit vs credit:
  - label=1: debit
  - label=0: credit

Usage:
    python scripts/prelabel_type_classifier_data.py ml_data/classifier_labeled.jsonl ml_data/type_classifier_labeled.jsonl
"""

import json
import sys
from pathlib import Path

# Keywords to detect debit transactions
DEBIT_KEYWORDS = {
    'debit', 'debited', 'spent', 'paid', 'payment', 'withdrawn', 'withdrawn',
    'transferred out', 'transfer to', 'sent', 'sent to', 'sent money',
    'charged', 'charged to', 'deducted', 'cut', 'vpa', 'merchant',
    'upi', 'neft', 'rtgs', 'cheque', 'purchase',
}

# Keywords to detect credit transactions
CREDIT_KEYWORDS = {
    'credit', 'credited', 'received', 'deposited', 'added', 'refund',
    'refunded', 'transferred in', 'transfer from', 'received from',
    'salary', 'deposit', 'income', 'bonus', 'cashback', 'reward',
}


def label_txn_type(email_body: str) -> int:
    """
    Heuristic to label transaction as debit (1) or credit (0).
    this is unreliable so make sure to check manually after this creates the labels.
    
    Returns:
        1 for debit, 0 for credit
    """
    body_lower = email_body.lower()
    
    debit_count = sum(1 for kw in DEBIT_KEYWORDS if kw in body_lower)
    credit_count = sum(1 for kw in CREDIT_KEYWORDS if kw in body_lower)
    
    # If debit keywords outnumber credit keywords, label as debit (1)
    if debit_count > credit_count:
        return 1
    elif credit_count > debit_count:
        return 0
    else:
        # Default to debit if unclear
        return 1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'type_classifier_labeled.jsonl'
    
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    # Ensure output directory exists
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Extract transaction emails and label by type
    txn_count = 0
    debit_count = 0
    credit_count = 0
    
    with open(input_path, 'r') as infile, open(output_path, 'w') as outfile:
        for line in infile:
            record = json.loads(line.strip())
            
            # Keep only transaction emails (label=1)
            if record.get('label') != 1:
                continue
            
            # Label by type: 1=debit, 0=credit
            type_label = label_txn_type(record['emailBody'])
            
            # Create new record for type classifier
            type_record = {
                'text': record['emailBody'],
                'label': type_label,
                'source_domain': record.get('fromEmail', ''),
                'type': 'debit' if type_label == 1 else 'credit',
            }
            
            outfile.write(json.dumps(type_record) + '\n')
            
            txn_count += 1
            if type_label == 1:
                debit_count += 1
            else:
                credit_count += 1
    
    print(f"✓ Extracted {txn_count} transaction emails")
    print(f"  - Debit (label=1): {debit_count} ({100*debit_count/txn_count:.1f}%)")
    print(f"  - Credit (label=0): {credit_count} ({100*credit_count/txn_count:.1f}%)")
    print(f"✓ Saved to: {output_path}")
    print(f"\nNext step: python scripts/create_type_classifier_csv.py {output_path}")

if __name__ == '__main__':
    main()
