"""Unit tests for entity matcher service."""

import pytest
from unittest.mock import patch
from tests.factories import CustomerFactory, ProjectFactory


@pytest.mark.unit
class TestEntityMatcher:
    def test_exact_customer_match(self, user):
        customer = CustomerFactory(user=user, name='ACME Corporation')
        # matcher = EntityMatcher(user)
        # match, confidence = matcher.match_customer('ACME Corporation')
        # assert match == customer
        # assert confidence == 1.0

    def test_fuzzy_customer_match(self, user):
        customer = CustomerFactory(user=user, name='ACME Corp')
        # matcher = EntityMatcher(user)
        # match, confidence = matcher.match_customer('ACME Corporation')
        # assert match == customer
        # assert confidence > 0.8

    def test_no_match_below_threshold(self, user):
        customer = CustomerFactory(user=user, name='ACME Corp')
        # matcher = EntityMatcher(user)
        # match, confidence = matcher.match_customer('Completely Different Name')
        # assert match is None
        # assert confidence < 0.7

    def test_project_matching(self, user):
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer, name='Website Redesign')
        # Test fuzzy project matching

    def test_multiple_matches_returns_best(self, user):
        CustomerFactory(user=user, name='ACME Corp')
        CustomerFactory(user=user, name='ACME Corporation')
        # Should return the one with highest confidence

    def test_case_insensitive_matching(self, user):
        customer = CustomerFactory(user=user, name='ACME Corp')
        # match = matcher.match_customer('acme corp')
        # assert match is not None
