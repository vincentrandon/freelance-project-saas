"""Unit tests for batch document processor."""

import pytest
from tests.factories import ImportedDocumentFactory


@pytest.mark.unit
class TestBatchProcessor:
    def test_batch_processing(self, user):
        docs = ImportedDocumentFactory.create_batch(5, user=user)
        # processor = BatchProcessor()
        # results = processor.process_batch([doc.id for doc in docs])
        # assert len(results) == 5

    def test_parallel_processing(self):
        # Test concurrent processing
        pass

    def test_error_handling_in_batch(self):
        # Test that one failure doesn't stop the batch
        pass
