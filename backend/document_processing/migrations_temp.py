# Add these fields to AIModelVersion model in models.py

    fine_tuned_model = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text=_("Name of the fine-tuned model from OpenAI")
    )

    training_error = models.TextField(
        null=True,
        blank=True,
        help_text=_("Error message if training failed")
    )
