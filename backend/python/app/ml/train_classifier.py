"""
Train a binary classifier to distinguish transaction emails from non-transaction emails.

This script:
1. Loads the CSV data (text, label, source_domain)
2. Splits into train/test
3. Trains a TF-IDF + Logistic Regression pipeline
4. Evaluates and prints metrics
5. Saves the model and vectorizer for inference

Usage:
    python train_classifier.py ../data/classifier_data.csv
"""

import sys
import json
from pathlib import Path
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn import metrics


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    csv_file = sys.argv[1]
    csv_path = Path(csv_file)
    
    if not csv_path.exists():
        print(f"Error: {csv_file} not found")
        sys.exit(1)
    
    # Load data
    print(f"Loading data from {csv_file}...")
    df = pd.read_csv(csv_path)
    
    # Basic checks
    if df.empty:
        print("Error: CSV is empty")
        sys.exit(1)
    
    if 'text' not in df.columns or 'label' not in df.columns:
        print("Error: CSV must have 'text' and 'label' columns")
        sys.exit(1)
    
    # Print dataset info
    print(f"\n{'='*70}")
    print("DATASET SUMMARY")
    print(f"{'='*70}")
    print(f"Total records: {len(df)}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
    print(f"Text length stats:\n{df['text'].str.len().describe()}")
    
    # Prepare data
    X = df['text'].astype(str)  # Ensure strings
    y = df['label'].astype(int)
    
    # Train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=0.2, 
        random_state=42, 
        stratify=y  # Keep label balance
    )
    
    print(f"\nTrain set: {len(X_train)} | Test set: {len(X_test)}")
    
    # Build pipeline: TF-IDF + Logistic Regression
    print(f"\n{'='*70}")
    print("TRAINING CLASSIFIER")
    print(f"{'='*70}")
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=5000,
            min_df=2,
            max_df=0.8,
            ngram_range=(1, 2),
            stop_words='english'
        )),
        ('classifier', LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight='balanced'  # Handle imbalance
        ))
    ])
    
    # Train
    pipeline.fit(X_train, y_train)
    print("✓ Model trained")
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
    
    print(f"\n{'='*70}")
    print("EVALUATION METRICS")
    print(f"{'='*70}")
    
    accuracy = metrics.accuracy_score(y_test, y_pred)
    precision = metrics.precision_score(y_test, y_pred, zero_division=0)
    recall = metrics.recall_score(y_test, y_pred, zero_division=0)
    f1 = metrics.f1_score(y_test, y_pred, zero_division=0)
    roc_auc = metrics.roc_auc_score(y_test, y_pred_proba)
    
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    
    # Confusion matrix
    cm = metrics.confusion_matrix(y_test, y_pred)
    print(f"\nConfusion Matrix:")
    print(f"  TN={cm[0,0]}, FP={cm[0,1]}")
    print(f"  FN={cm[1,0]}, TP={cm[1,1]}")
    
    # Classification report
    print(f"\n{metrics.classification_report(y_test, y_pred)}")
    
    # Save model
    model_dir = Path(__file__).parent / 'models'
    model_dir.mkdir(exist_ok=True)
    
    model_path = model_dir / 'email_classifier.joblib'
    joblib.dump(pipeline, model_path)
    print(f"\n✓ Model saved to {model_path}")
    
    # Save metadata
    metadata = {
        'model_type': 'LogisticRegression + TF-IDF',
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'roc_auc': float(roc_auc),
        'train_size': len(X_train),
        'test_size': len(X_test),
        'total_size': len(df),
        'label_distribution': df['label'].value_counts().to_dict(),
    }
    
    metadata_path = model_dir / 'classifier_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Metadata saved to {metadata_path}")
    
    print(f"\n{'='*70}\n")


if __name__ == '__main__':
    main()
