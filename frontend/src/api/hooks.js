import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials) => client.post('/auth/login/', credentials),
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (data) => client.post('/auth/registration/', data),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post('/auth/logout/'),
    onSuccess: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      queryClient.clear();
    },
  });
};

export const usePasswordReset = () => {
  return useMutation({
    mutationFn: (email) => client.post('/auth/password/reset/', { email }),
  });
};

export const usePasswordResetConfirm = () => {
  return useMutation({
    mutationFn: ({ uid, token, new_password1, new_password2 }) =>
      client.post('/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1,
        new_password2
      }),
  });
};

// Customer hooks
export const useCustomers = (options = {}) => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => client.get('/customers/').then((res) => res.data),
    ...options,
  });
};

export const useCustomer = (id, options = {}) => {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => client.get(`/customers/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/customers/', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.put(`/customers/${id}/`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/customers/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
};

export const useUploadCustomerAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return client.post(`/customers/${customerId}/upload_attachment/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId) => client.delete(`/customers/attachments/${attachmentId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

// Lead hooks
export const useLeads = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => client.get('/leads/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useLead = (id, options = {}) => {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => client.get(`/leads/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useLeadKanban = (options = {}) => {
  return useQuery({
    queryKey: ['leads', 'kanban'],
    queryFn: () => client.get('/leads/kanban_board/').then((res) => res.data),
    ...options,
  });
};

export const useLeadStats = (options = {}) => {
  return useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: () => client.get('/leads/stats/').then((res) => res.data),
    ...options,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/leads/', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => client.patch(`/leads/${id}/update_status/`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', 'kanban'] });
    },
  });
};

// Project hooks
export const useProjects = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => client.get('/projects/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useProject = (id, options = {}) => {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => client.get(`/projects/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/projects/', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUpdateProjectNotes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notesJson }) => client.put(`/projects/${id}/update_notes/`, { notes_json: notesJson }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.put(`/projects/${id}/`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/projects/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useProjectMetrics = (id, options = {}) => {
  return useQuery({
    queryKey: ['projects', id, 'metrics'],
    queryFn: () => client.get(`/projects/${id}/metrics/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useProjectInvoices = (id, options = {}) => {
  return useQuery({
    queryKey: ['projects', id, 'invoices'],
    queryFn: () => client.get(`/projects/${id}/invoices/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useProjectEstimates = (id, options = {}) => {
  return useQuery({
    queryKey: ['projects', id, 'estimates'],
    queryFn: () => client.get(`/projects/${id}/estimates/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

// Task hooks
export const useTasks = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => client.get('/projects/tasks/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useTask = (id, options = {}) => {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => client.get(`/projects/tasks/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/projects/tasks/', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects', response.data.project] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.put(`/projects/tasks/${id}/`, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects', response.data.project] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/projects/tasks/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useReorderTasks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskIds) => client.post('/projects/tasks/reorder/', { task_ids: taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

// Finance hooks
export const useBankAccounts = (options = {}) => {
  return useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: async () => {
      const res = await client.get('/finance/accounts/');
      // Ensure we always return an array
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
    ...options,
  });
};

export const useTransactions = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance', 'transactions', filters],
    queryFn: () => client.get('/finance/transactions/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useFinanceDashboard = (options = {}) => {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => client.get('/finance/transactions/dashboard/').then((res) => res.data),
    ...options,
  });
};

export const useReconcileTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.patch(`/finance/transactions/${id}/reconcile/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'dashboard'] });
    },
  });
};

// Invoice hooks
export const useInvoices = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => client.get('/invoices/invoices/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useInvoice = (id, options = {}) => {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => client.get(`/invoices/invoices/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useInvoiceStats = (options = {}) => {
  return useQuery({
    queryKey: ['invoices', 'stats'],
    queryFn: () => client.get('/invoices/invoices/stats/').then((res) => res.data),
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/invoices/invoices/', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });
};

export const useSendInvoice = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post(`/invoices/invoices/${id}/send_email/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
};

export const useMarkInvoicePaid = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.patch(`/invoices/invoices/${id}/mark_paid/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.put(`/invoices/invoices/${id}/`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', String(variables.id)] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/invoices/invoices/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useDuplicateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.post(`/invoices/invoices/${id}/duplicate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useGenerateInvoicePDF = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId }) =>
      client.post(`/invoices/invoices/${invoiceId}/generate_pdf/`),
    onSuccess: (response, variables) => {
      // Invalidate all invoices queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Refetch the specific invoice to get updated pdf_file field
      queryClient.invalidateQueries({ queryKey: ['invoices', String(variables.invoiceId)] });
    },
  });
};

export const useNextInvoiceNumber = (options = {}) => {
  return useQuery({
    queryKey: ['invoices', 'next-number'],
    queryFn: () => client.get('/invoices/invoices/next_number/').then((res) => res.data),
    ...options,
  });
};

export const useCreateCreditNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, reason }) =>
      client.post(`/invoices/invoices/${invoiceId}/create_credit_note/`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useCreateDepositInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, deposit_amount, payment_date, payment_method, deposit_percentage }) =>
      client.post(`/invoices/invoices/${invoiceId}/create_deposit_invoice/`, {
        deposit_amount,
        payment_date,
        payment_method,
        deposit_percentage
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// Estimate hooks
export const useEstimates = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['estimates', filters],
    queryFn: () => client.get('/invoices/estimates/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useEstimate = (id, options = {}) => {
  return useQuery({
    queryKey: ['estimates', id],
    queryFn: () => client.get(`/invoices/estimates/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useCreateEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/invoices/estimates/', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimates'] }),
  });
};

export const useUpdateEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.put(`/invoices/estimates/${id}/`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', variables.id] });
    },
  });
};

export const useDeleteEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/invoices/estimates/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useFinalizeEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.post(`/invoices/estimates/${id}/finalize/`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', id] });
    },
  });
};

export const useSendEstimate = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post(`/invoices/estimates/${id}/send_email/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates', id] });
    },
  });
};

export const useConvertEstimateToInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, due_days = 30 }) =>
      client.post(`/invoices/estimates/${estimateId}/convert_to_invoice/`, { due_days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const usePublishEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.patch(`/invoices/estimates/${id}/`, { status: 'sent' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', String(id)] });
    },
  });
};

export const useDuplicateEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.post(`/invoices/estimates/${id}/duplicate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useMarkEstimateAccepted = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.patch(`/invoices/estimates/${id}/mark_accepted/`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', String(id)] });
    },
  });
};

// Document Processing hooks
export const useImportedDocuments = (options = {}) => {
  return useQuery({
    queryKey: ['imported-documents'],
    queryFn: () => client.get('/document-processing/documents/').then((res) => res.data.results || res.data),
    ...options,
  });
};

export const useImportedDocument = (id, options = {}) => {
  return useQuery({
    queryKey: ['imported-documents', id],
    queryFn: () => client.get(`/document-processing/documents/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useUploadDocuments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files[]', file);
      });
      return client.post('/document-processing/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported-documents'] });
    },
  });
};

export const useDocumentPreview = (documentId, options = {}) => {
  return useQuery({
    queryKey: ['document-preview', documentId],
    queryFn: () => client.get(`/document-processing/documents/${documentId}/preview/`).then((res) => res.data),
    enabled: !!documentId,
    ...options,
  });
};

export const useReparseDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId) => client.post(`/document-processing/documents/${documentId}/reparse/`),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['imported-documents', documentId] });
    },
  });
};

// Import Preview hooks
export const useImportPreviews = (options = {}) => {
  return useQuery({
    queryKey: ['import-previews'],
    queryFn: () => client.get('/document-processing/previews/').then((res) => res.data),
    ...options,
  });
};

export const usePendingPreviews = (options = {}) => {
  return useQuery({
    queryKey: ['import-previews', 'pending'],
    queryFn: () => client.get('/document-processing/previews/pending/').then((res) => res.data),
    ...options,
  });
};

export const useImportPreview = (id, options = {}) => {
  return useQuery({
    queryKey: ['import-previews', id],
    queryFn: () => client.get(`/document-processing/previews/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useUpdatePreviewData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ previewId, data }) => client.patch(`/document-processing/previews/${previewId}/update_data/`, data),
    onSuccess: (_, { previewId }) => {
      queryClient.invalidateQueries({ queryKey: ['import-previews', previewId] });
      queryClient.invalidateQueries({ queryKey: ['document-preview'] });
    },
  });
};

export const useApprovePreview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (previewId) => client.post(`/document-processing/previews/${previewId}/approve/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-previews'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useRejectPreview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (previewId) => client.post(`/document-processing/previews/${previewId}/reject/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-previews'] });
    },
  });
};

// AI Assistant hooks
export const useGenerateEstimateFromPrompt = () => {
  return useMutation({
    mutationFn: (data) => client.post('/document-processing/ai-assist/generate-from-prompt/', data),
  });
};

export const useSuggestPricing = () => {
  return useMutation({
    mutationFn: (data) => client.post('/document-processing/ai-assist/suggest-pricing/', data),
  });
};

export const useExpandTask = () => {
  return useMutation({
    mutationFn: (data) => client.post('/document-processing/ai-assist/expand-task/', data),
  });
};

export const useHistoricalAnalysis = (options = {}) => {
  return useQuery({
    queryKey: ['historical-analysis'],
    queryFn: () => client.post('/document-processing/ai-assist/historical-analysis/', {}).then((res) => res.data),
    ...options,
  });
};

// Profile hooks
export const useProfile = (options = {}) => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => client.get('/profile/me/').then((res) => res.data),
    ...options,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.patch('/profile/me/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const usePricingSettings = (options = {}) => {
  return useQuery({
    queryKey: ['pricing-settings'],
    queryFn: () => client.get('/profile/pricing_settings/').then((res) => res.data),
    ...options,
  });
};

export const useUpdatePricingSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.patch('/profile/pricing_settings/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useCalculateTJM = () => {
  return useMutation({
    mutationFn: (data) => client.post('/profile/calculate_tjm/', data),
  });
};

export const useCompanyInfo = (options = {}) => {
  return useQuery({
    queryKey: ['company-info'],
    queryFn: () => client.get('/profile/company_info/').then((res) => res.data),
    ...options,
  });
};

// Onboarding hooks
export const useOnboardingStatus = (options = {}) => {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => client.get('/profile/onboarding_status/').then((res) => res.data),
    ...options,
  });
};

export const useUpdateOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.patch('/profile/update_onboarding/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data = {}) => client.post('/profile/complete_onboarding/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

// Enhanced Estimate hooks
export const useAIGenerateEstimate = () => {
  return useMutation({
    mutationFn: (data) => {
      // Ensure we send the correct parameters
      const payload = {
        prompt: data.prompt || data.project_description,
        customer: data.customer,
        project: data.project,
        additional_context: data.additional_context
      };
      return client.post('/invoices/estimates/ai_generate/', payload);
    },
  });
};

export const useApplySecurityMargin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, security_margin_percentage }) =>
      client.post(`/invoices/estimates/${estimateId}/apply_security_margin/`, { security_margin_percentage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useSuggestMargin = () => {
  return useMutation({
    mutationFn: (data) => {
      // Standalone suggest margin (no estimate ID required)
      const payload = {
        project_description: data.project_description,
        items: data.items,
        customer_type: data.customer_type || 'new'
      };
      return client.post('/invoices/estimates/suggest_margin/', payload);
    },
  });
};

export const useConvertToTJM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, tjm_rate }) =>
      client.post(`/invoices/estimates/${estimateId}/convert_to_tjm/`, { tjm_rate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
};

export const useNextEstimateNumber = (options = {}) => {
  return useQuery({
    queryKey: ['estimates', 'next-number'],
    queryFn: () => client.get('/invoices/estimates/next_number/').then((res) => res.data),
    ...options,
  });
};

export const useHistoricalContext = (options = {}) => {
  return useQuery({
    queryKey: ['historical-context'],
    queryFn: () => client.get('/invoices/estimates/historical_context/').then((res) => res.data),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    ...options,
  });
};

export const useSuggestLineItem = () => {
  return useMutation({
    mutationFn: (data) => {
      const payload = {
        item_description: data.item_description || data.description,
        project_context: data.project_context,
        customer_id: data.customer_id,
        historical_context: data.historical_context  // Pass cached historical data
      };
      return client.post('/invoices/estimates/suggest_items/', payload);
    },
  });
};

export const useRequestSignature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, ...data }) =>
      client.post(`/invoices/estimates/${estimateId}/request_signature/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
    },
  });
};

export const useGenerateEstimatePDF = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId }) =>
      client.post(`/invoices/estimates/${estimateId}/generate_pdf/`),
    onSuccess: (response, variables) => {
      // Invalidate all estimates queries
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      // Refetch the specific estimate to get updated pdf_file field
      queryClient.invalidateQueries({ queryKey: ['estimates', String(variables.estimateId)] });
    },
  });
};

// Public Signature hooks (no auth)
export const usePublicSignatureRequest = (token, options = {}) => {
  return useQuery({
    queryKey: ['public-signature', token],
    queryFn: () => client.get(`/invoices/sign/${token}/`).then((res) => res.data),
    enabled: !!token,
    ...options,
  });
};

export const useSignEstimate = () => {
  return useMutation({
    mutationFn: ({ token, signature_method, signature_data }) =>
      client.post(`/invoices/sign/${token}/sign/`, { signature_method, signature_data }),
  });
};

export const useDeclineEstimate = () => {
  return useMutation({
    mutationFn: ({ token, reason }) =>
      client.post(`/invoices/sign/${token}/decline/`, { reason }),
  });
};

// Task Catalogue hooks
export const useTaskCatalogue = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['task-catalogue', filters],
    queryFn: async () => {
      const res = await client.get('/projects/task-catalogue/', { params: filters });
      // Ensure we return an array - DRF returns paginated results by default
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
    ...options,
  });
};

export const useTaskTemplate = (id, options = {}) => {
  return useQuery({
    queryKey: ['task-catalogue', id],
    queryFn: () => client.get(`/projects/task-catalogue/${id}/`).then((res) => res.data),
    enabled: !!id,
    ...options,
  });
};

export const useSearchTaskCatalogue = () => {
  return useMutation({
    mutationFn: ({ query, category, limit = 10 }) =>
      client.get('/projects/task-catalogue/search/', {
        params: { q: query, category, limit }
      }),
  });
};

export const useSuggestTasks = () => {
  return useMutation({
    mutationFn: (data) => client.post('/projects/task-catalogue/suggest/', data),
  });
};

export const useTaskCatalogueAnalytics = (options = {}) => {
  return useQuery({
    queryKey: ['task-catalogue', 'analytics'],
    queryFn: () => client.get('/projects/task-catalogue/analytics/').then((res) => res.data),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    ...options,
  });
};

export const useCreateTaskTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/projects/task-catalogue/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-catalogue'] });
    },
  });
};

export const useCreateTaskTemplateFromData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/projects/task-catalogue/from_task/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-catalogue'] });
    },
  });
};

export const useUpdateTaskTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => client.put(`/projects/task-catalogue/${id}/`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-catalogue'] });
      queryClient.invalidateQueries({ queryKey: ['task-catalogue', variables.id] });
    },
  });
};

export const useDeleteTaskTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/projects/task-catalogue/${id}/deactivate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-catalogue'] });
    },
  });
};

export const useActivateTaskTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.post(`/projects/task-catalogue/${id}/activate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-catalogue'] });
    },
  });
};

export const useUseTaskTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, project_id, adjust_hours, adjust_rate }) =>
      client.post(`/projects/task-catalogue/${templateId}/use_template/`, {
        project_id,
        adjust_hours,
        adjust_rate
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects', response.data.task.project] });
      queryClient.invalidateQueries({ queryKey: ['task-catalogue'] }); // Update usage stats
    },
  });
};

// Task History hooks
export const useTaskHistory = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['task-history', filters],
    queryFn: () => client.get('/projects/task-history/', { params: filters }).then((res) => res.data),
    ...options,
  });
};

export const useTaskAccuracyReport = (options = {}) => {
  return useQuery({
    queryKey: ['task-history', 'accuracy-report'],
    queryFn: () => client.get('/projects/task-history/accuracy_report/').then((res) => res.data),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    ...options,
  });
};

// Dashboard hooks
export const useRecentTransactions = (limit = 10, options = {}) => {
  return useQuery({
    queryKey: ['finance', 'transactions', 'recent', limit],
    queryFn: () => client.get('/finance/transactions/', {
      params: { ordering: '-date', limit }
    }).then((res) => res.data),
    ...options,
  });
};

export const useRecentInvoices = (limit = 5, options = {}) => {
  return useQuery({
    queryKey: ['invoices', 'recent', limit],
    queryFn: () => client.get('/invoices/invoices/', {
      params: { ordering: '-issue_date', limit }
    }).then((res) => res.data),
    ...options,
  });
};

// Notification hooks
export const useNotifications = (options = {}) => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => client.get('/notifications/').then((res) => res.data),
    refetchInterval: 3000, // Poll every 3 seconds
    ...options,
  });
};

export const useUnreadNotificationsCount = (options = {}) => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => client.get('/notifications/unread_count/').then((res) => res.data.count),
    refetchInterval: 3000, // Poll every 3 seconds
    ...options,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.patch(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post('/notifications/mark_all_read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/notifications/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};
