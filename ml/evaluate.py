from sklearn.metrics import classification_report, roc_auc_score, precision_recall_curve, auc

def evaluate_model(model, X_test, y_test) -> dict:
    """Compute precision, recall, F1, and PR-AUC with focus on low false positives."""
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else preds

    roc_auc = roc_auc_score(y_test, probs)
    precision, recall, _ = precision_recall_curve(y_test, probs)
    pr_auc = auc(recall, precision)

    report = classification_report(y_test, preds, output_dict=True)
    return {
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "classification_report": report,
    }
