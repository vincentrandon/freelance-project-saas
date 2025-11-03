"""
Service for merging user clarifications with new AI extractions during reparse.
Preserves user-refined task data while updating other document fields.
"""

from fuzzywuzzy import fuzz
from typing import Dict, List, Any, Tuple
from datetime import datetime


class ClarificationMerger:
    """
    Intelligently merges previous user clarifications with new AI extractions.
    Uses fuzzy matching to identify corresponding tasks across reparses.
    """

    # Similarity threshold for considering tasks as "same" (0-100)
    TASK_MATCH_THRESHOLD = 80

    def __init__(self, document):
        """
        Initialize with the document being reparsed.

        Args:
            document: ImportedDocument instance
        """
        self.document = document
        self.clarification_history = document.clarification_history or {}

    def should_preserve_clarifications(self) -> bool:
        """
        Determine if clarifications should be preserved based on document settings
        and clarification history existence.

        Returns:
            bool: True if clarifications should be merged
        """
        return (
            self.document.preserve_clarifications_on_reparse and
            bool(self.clarification_history) and
            self.document.preview  # Must have previous preview
        )

    def merge_tasks(
        self,
        new_tasks: List[Dict[str, Any]],
        previous_tasks: List[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Merge new AI-extracted tasks with previous user-refined tasks.

        Strategy:
        1. For each new task, find best matching previous task (fuzzy name match)
        2. If match score >= TASK_MATCH_THRESHOLD, use refined version
        3. If no match, use new AI extraction as-is
        4. Track merge statistics for debugging

        Args:
            new_tasks: Tasks from new AI extraction
            previous_tasks: Tasks from previous ImportPreview (optional, auto-loads if None)

        Returns:
            Tuple of (merged_tasks, merge_stats)
        """
        if not self.should_preserve_clarifications():
            return new_tasks, {
                "preserved_count": 0,
                "new_count": len(new_tasks),
                "reason": "preservation_disabled_or_no_history"
            }

        # Load previous tasks if not provided
        if previous_tasks is None:
            try:
                previous_tasks = self.document.preview.tasks_data
            except AttributeError:
                return new_tasks, {
                    "preserved_count": 0,
                    "new_count": len(new_tasks),
                    "reason": "no_previous_preview"
                }

        merged_tasks = []
        preserved_count = 0
        new_count = 0
        merge_details = []

        for new_task_idx, new_task in enumerate(new_tasks):
            # Find best matching previous task
            best_match, best_score = self._find_best_task_match(
                new_task,
                previous_tasks
            )

            if best_match and best_score >= self.TASK_MATCH_THRESHOLD:
                # Use refined version from previous clarification
                merged_task = self._create_merged_task(
                    new_task=new_task,
                    refined_task=best_match,
                    match_score=best_score
                )
                merged_tasks.append(merged_task)
                preserved_count += 1

                merge_details.append({
                    "task_index": new_task_idx,
                    "action": "preserved",
                    "match_score": best_score,
                    "original_name": new_task.get("name", ""),
                    "refined_name": best_match.get("name", "")
                })

                # Store in clarification history for future reparses
                self._update_clarification_history(
                    task_identifier=self._generate_task_identifier(new_task),
                    refined_task=merged_task
                )
            else:
                # No good match found, use new AI extraction
                merged_tasks.append(new_task)
                new_count += 1

                merge_details.append({
                    "task_index": new_task_idx,
                    "action": "new_extraction",
                    "match_score": best_score if best_match else 0,
                    "name": new_task.get("name", "")
                })

        merge_stats = {
            "preserved_count": preserved_count,
            "new_count": new_count,
            "total_count": len(merged_tasks),
            "preservation_rate": round((preserved_count / len(new_tasks) * 100), 2) if new_tasks else 0,
            "merge_details": merge_details
        }

        return merged_tasks, merge_stats

    def _find_best_task_match(
        self,
        new_task: Dict[str, Any],
        previous_tasks: List[Dict[str, Any]]
    ) -> Tuple[Dict[str, Any] | None, int]:
        """
        Find the best matching previous task for a new task using fuzzy matching.

        Uses multiple similarity algorithms:
        - fuzz.ratio: Character-by-character similarity
        - fuzz.token_sort_ratio: Word order independent
        - fuzz.partial_ratio: Substring matching

        Args:
            new_task: Task from new AI extraction
            previous_tasks: List of tasks from previous clarification

        Returns:
            Tuple of (best_match_task, similarity_score)
        """
        new_task_name = (new_task.get("name") or "").lower().strip()
        if not new_task_name:
            return None, 0

        best_match = None
        best_score = 0

        for prev_task in previous_tasks:
            prev_task_name = (prev_task.get("name") or "").lower().strip()
            if not prev_task_name:
                continue

            # Calculate multiple similarity scores
            ratio_score = fuzz.ratio(new_task_name, prev_task_name)
            token_sort_score = fuzz.token_sort_ratio(new_task_name, prev_task_name)
            partial_score = fuzz.partial_ratio(new_task_name, prev_task_name)

            # Weighted average (favor exact matches, then token sort, then partial)
            combined_score = (
                ratio_score * 0.5 +
                token_sort_score * 0.3 +
                partial_score * 0.2
            )

            if combined_score > best_score:
                best_score = combined_score
                best_match = prev_task

        return best_match, int(best_score)

    def _create_merged_task(
        self,
        new_task: Dict[str, Any],
        refined_task: Dict[str, Any],
        match_score: int
    ) -> Dict[str, Any]:
        """
        Create merged task by preferring refined fields but updating pricing
        from new extraction if significantly different.

        Strategy:
        - Use refined name, description, category (user's clarification)
        - Update estimated_hours, hourly_rate, amount if new values differ by >10%
        - Preserve user's edits unless pricing changed significantly

        Args:
            new_task: Freshly extracted task from AI
            refined_task: User-refined task from previous clarification
            match_score: Similarity score (0-100)

        Returns:
            Merged task dictionary
        """
        merged = refined_task.copy()

        # Check if pricing changed significantly (>10% difference)
        pricing_changed = self._pricing_significantly_changed(new_task, refined_task)

        if pricing_changed:
            # Update pricing fields from new extraction
            merged["estimated_hours"] = new_task.get("estimated_hours")
            merged["hourly_rate"] = new_task.get("hourly_rate")
            merged["amount"] = new_task.get("amount")
            merged["actual_hours"] = new_task.get("actual_hours")

            # Add metadata to track pricing update
            merged["_pricing_updated_from_reparse"] = True
            merged["_pricing_update_timestamp"] = datetime.utcnow().isoformat()
        else:
            # Keep refined pricing
            merged["_pricing_preserved_from_clarification"] = True

        # Always add merge metadata
        merged["_merge_metadata"] = {
            "match_score": match_score,
            "merged_at": datetime.utcnow().isoformat(),
            "source": "clarification_merge"
        }

        return merged

    def _pricing_significantly_changed(
        self,
        new_task: Dict[str, Any],
        old_task: Dict[str, Any],
        threshold: float = 0.10
    ) -> bool:
        """
        Check if pricing changed by more than threshold (default 10%).

        Args:
            new_task: New extraction
            old_task: Previous refined task
            threshold: Percentage threshold (0.10 = 10%)

        Returns:
            True if pricing changed significantly
        """
        # Compare amount (most important)
        new_amount = new_task.get("amount", 0) or 0
        old_amount = old_task.get("amount", 0) or 0

        if old_amount == 0:
            return new_amount > 0

        amount_diff_pct = abs(new_amount - old_amount) / old_amount
        if amount_diff_pct > threshold:
            return True

        # Compare estimated hours
        new_hours = new_task.get("estimated_hours", 0) or 0
        old_hours = old_task.get("estimated_hours", 0) or 0

        if old_hours == 0:
            return new_hours > 0

        hours_diff_pct = abs(new_hours - old_hours) / old_hours
        if hours_diff_pct > threshold:
            return True

        return False

    def _generate_task_identifier(self, task: Dict[str, Any]) -> str:
        """
        Generate stable identifier for a task based on name + amount.
        Used as key in clarification_history.

        Args:
            task: Task dictionary

        Returns:
            Stable identifier string
        """
        name = (task.get("name") or "").lower().strip()
        amount = task.get("amount", 0) or 0

        # Create hash-like identifier
        import hashlib
        identifier_string = f"{name}_{amount}"
        identifier_hash = hashlib.md5(identifier_string.encode()).hexdigest()[:12]

        return identifier_hash

    def _update_clarification_history(
        self,
        task_identifier: str,
        refined_task: Dict[str, Any]
    ):
        """
        Store refined task in clarification history for future reparses.

        Args:
            task_identifier: Unique task identifier
            refined_task: User-refined task data
        """
        if task_identifier not in self.clarification_history:
            self.clarification_history[task_identifier] = []

        # Add version entry
        self.clarification_history[task_identifier].append({
            "refined_data": refined_task,
            "timestamp": datetime.utcnow().isoformat(),
            "version": len(self.clarification_history[task_identifier]) + 1
        })

        # Keep only last 5 versions per task to avoid bloat
        if len(self.clarification_history[task_identifier]) > 5:
            self.clarification_history[task_identifier] = (
                self.clarification_history[task_identifier][-5:]
            )

    def save_clarification_history(self):
        """
        Save updated clarification history back to document.
        Call this after merge_tasks() to persist changes.
        """
        self.document.clarification_history = self.clarification_history
        self.document.save(update_fields=["clarification_history"])

    def get_merge_summary(self, merge_stats: Dict[str, Any]) -> str:
        """
        Generate human-readable summary of merge operation.

        Args:
            merge_stats: Statistics from merge_tasks()

        Returns:
            Summary string
        """
        preserved = merge_stats.get("preserved_count", 0)
        new = merge_stats.get("new_count", 0)
        rate = merge_stats.get("preservation_rate", 0)

        if preserved == 0:
            return f"Imported {new} new tasks (no previous clarifications to preserve)"

        return (
            f"Preserved {preserved} clarified tasks, imported {new} new tasks "
            f"({rate}% preservation rate)"
        )
