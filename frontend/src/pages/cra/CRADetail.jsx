import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCRA,
  useDeleteCRA,
  useGenerateCRAPDF,
  useSendCRAForValidation,
  useGenerateInvoiceFromCRA,
} from '../../api/hooks';
import Header from '../../partials/Header';
import Sidebar from '../../partials/Sidebar';
import ModalBasic from '../../components/ModalBasic';
import DropdownActionsCRA from '../../components/DropdownActionsCRA';
import { useTranslation } from 'react-i18next';

// Notification Modal Component
function NotificationModal({ isOpen, setIsOpen, type, title, message }) {
  const bgColor = type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
  const borderColor = type === 'success' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800';
  const iconColor = type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const textColor = type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';

  return (
    <ModalBasic modalOpen={isOpen} setModalOpen={setIsOpen} title={title}>
      <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={iconColor}>
            {type === 'success' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className={`text-sm ${textColor}`}>{message}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </ModalBasic>
  );
}

function CRADetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: craData, isLoading } = useCRA(id);
  const deleteMutation = useDeleteCRA();
  const generatePDFMutation = useGenerateCRAPDF();
  const sendValidationMutation = useSendCRAForValidation();
  const generateInvoiceMutation = useGenerateInvoiceFromCRA();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [generateInvoiceModalOpen, setGenerateInvoiceModalOpen] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [signerData, setSignerData] = useState({
    signer_name: '',
    signer_email: '',
    signer_company: '',
  });

  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  const handleActionClick = (action) => {
    switch (action) {
      case 'view':
        // Already on view page
        break;
      case 'generate-pdf':
        handleGeneratePDF();
        break;
      case 'view-pdf':
        if (cra.pdf_file) {
          window.open(cra.pdf_file, '_blank');
        }
        break;
      case 'send-validation':
        setSendModalOpen(true);
        break;
      case 'generate-invoice':
        setGenerateInvoiceModalOpen(true);
        break;
      case 'edit':
        navigate(`/cra/${id}/edit`);
        break;
      case 'duplicate':
        // TODO: Implement duplicate functionality
        showNotification('info', 'Info', 'Duplicate feature coming soon');
        break;
      case 'delete':
        setDeleteModalOpen(true);
        break;
      default:
        break;
    }
  };

  const cra = craData?.data;

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200',
      pending_validation: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
      validated: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      pending_validation: 'En attente de validation',
      validated: 'Validé',
      rejected: 'Rejeté',
    };
    return labels[status] || status;
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/cra');
    } catch (error) {
      console.error('Error deleting CRA:', error);
      showNotification('error', 'Erreur', 'Erreur lors de la suppression du CRA: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleGeneratePDF = async () => {
    try {
      await generatePDFMutation.mutateAsync(id);
      showNotification('success', 'Succès', 'PDF généré avec succès!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification('error', 'Erreur', 'Erreur lors de la génération du PDF: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSendForValidation = async () => {
    try {
      await sendValidationMutation.mutateAsync({
        id,
        ...signerData,
      });
      setSendModalOpen(false);
      showNotification('success', 'Succès', 'CRA envoyé pour validation!');
    } catch (error) {
      console.error('Error sending CRA:', error);
      showNotification('error', 'Erreur', 'Erreur lors de l\'envoi du CRA: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const response = await generateInvoiceMutation.mutateAsync(id);
      setGenerateInvoiceModalOpen(false);
      showNotification('success', 'Succès', 'Facture créée avec succès!');
      setTimeout(() => {
        navigate(`/invoicing?invoice=${response.data.invoice.id}`);
      }, 1500);
    } catch (error) {
      console.error('Error generating invoice:', error);
      setGenerateInvoiceModalOpen(false);
      showNotification('error', 'Erreur', 'Erreur lors de la génération de la facture: ' + (error.response?.data?.error || error.message));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header />
          <main className="flex items-center justify-center h-full">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </main>
        </div>
      </div>
    );
  }

  if (!cra) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header />
          <main className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">CRA introuvable</h2>
              <button onClick={() => navigate('/cra')} className="btn bg-indigo-500 hover:bg-indigo-600 text-white">
                Retour à la liste
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header />

        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">

            {/* Page header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <button
                  onClick={() => navigate('/cra')}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour
                </button>
                <h1 className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 font-bold">
                  CRA {monthNames[cra.period_month - 1]} {cra.period_year}
                </h1>
                <div className="mt-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cra.status)}`}>
                    {getStatusLabel(cra.status)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Primary Action Buttons - Keep most important visible */}
                {cra.status === 'draft' && (
                  <button
                    onClick={() => setSendModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Envoyer pour validation
                  </button>
                )}

                {cra.status === 'validated' && (
                  <button
                    onClick={() => setGenerateInvoiceModalOpen(true)}
                    disabled={generateInvoiceMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generateInvoiceMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Génération...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Générer Facture</span>
                      </>
                    )}
                  </button>
                )}

                {/* Dropdown Menu for all other actions */}
                <DropdownActionsCRA cra={cra} onAction={handleActionClick} />
              </div>
            </div>

            {/* CRA Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Informations</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Client</div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">{cra.customer.name}</div>
                    {cra.customer.company && (
                      <div className="text-sm text-slate-500 dark:text-slate-400">{cra.customer.company}</div>
                    )}
                  </div>

                  {cra.project && (
                    <div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Projet</div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{cra.project.name}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Période</div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {monthNames[cra.period_month - 1]} {cra.period_year}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Créé le</div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {new Date(cra.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {cra.validated_at && (
                    <div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Validé le</div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {new Date(cra.validated_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Résumé</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Nombre de tâches:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{cra.tasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total jours:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{cra.total_days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Taux journalier:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(cra.daily_rate)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-slate-700">
                    <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">Total HT:</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(cra.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg mb-8">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tâches incluses</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="table-auto w-full">
                  <thead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 bg-gray-50 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Tâche</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Projet</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-right">Jours</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-right">Montant</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-200">
                    {cra.tasks.map((task) => (
                      <tr key={task.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-100">{task.name}</div>
                          {task.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{task.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800 dark:text-slate-100">{task.project?.name || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-slate-800 dark:text-slate-100">{task.worked_days}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(
                              task.worked_days * cra.daily_rate
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {cra.notes && (
              <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{cra.notes}</p>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Delete Modal */}
      <ModalBasic
        isOpen={deleteModalOpen}
        setIsOpen={setDeleteModalOpen}
        title="Supprimer le CRA"
      >
        <div className="px-5 py-4">
          <div className="text-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100 mb-3">
              Êtes-vous sûr de vouloir supprimer ce CRA ?
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Cette action est irréversible. Le CRA sera définitivement supprimé.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap justify-end space-x-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="btn bg-white border-gray-200 hover:border-gray-300 text-slate-600 dark:text-slate-400"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="btn bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Send for Validation Modal */}
      <ModalBasic
        modalOpen={sendModalOpen}
        setModalOpen={setSendModalOpen}
        title="Envoyer pour validation"
      >
        <div className="px-5 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du signataire *
              </label>
              <input
                type="text"
                value={signerData.signer_name}
                onChange={(e) => setSignerData({ ...signerData, signer_name: e.target.value })}
                className="form-input w-full"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email du signataire *
              </label>
              <input
                type="email"
                value={signerData.signer_email}
                onChange={(e) => setSignerData({ ...signerData, signer_email: e.target.value })}
                className="form-input w-full"
                placeholder="jean.dupont@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Société (optionnel)
              </label>
              <input
                type="text"
                value={signerData.signer_company}
                onChange={(e) => setSignerData({ ...signerData, signer_company: e.target.value })}
                className="form-input w-full"
                placeholder="Nom de la société"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Un email sera envoyé au signataire avec un lien pour valider ce CRA.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap justify-end space-x-2">
            <button
              onClick={() => setSendModalOpen(false)}
              className="btn bg-white border-gray-200 hover:border-gray-300 text-slate-600 dark:text-slate-400"
            >
              Annuler
            </button>
            <button
              onClick={handleSendForValidation}
              disabled={!signerData.signer_name || !signerData.signer_email || sendValidationMutation.isPending}
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
            >
              {sendValidationMutation.isPending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Generate Invoice Confirmation Modal */}
      <ModalBasic
        modalOpen={generateInvoiceModalOpen}
        setModalOpen={setGenerateInvoiceModalOpen}
        title="Générer une facture"
      >
        <div className="px-5 py-4">
          <div className="text-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100 mb-3">
              Générer une facture depuis ce CRA ?
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Une nouvelle facture sera créée avec les informations de ce CRA validé.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap justify-end space-x-2">
            <button
              onClick={() => setGenerateInvoiceModalOpen(false)}
              className="btn bg-white border-gray-200 hover:border-gray-300 text-slate-600 dark:text-slate-400"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerateInvoice}
              disabled={generateInvoiceMutation.isPending}
              className="btn bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {generateInvoiceMutation.isPending ? 'Génération...' : 'Générer'}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        setIsOpen={(isOpen) => setNotification({ ...notification, isOpen })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}

export default CRADetail;
