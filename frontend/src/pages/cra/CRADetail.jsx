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
import { useTranslation } from 'react-i18next';

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
  const [signerData, setSignerData] = useState({
    signer_name: '',
    signer_email: '',
    signer_company: '',
  });

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
      alert('Erreur lors de la suppression du CRA');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      await generatePDFMutation.mutateAsync(id);
      alert('PDF généré avec succès!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const handleSendForValidation = async () => {
    try {
      await sendValidationMutation.mutateAsync({
        id,
        ...signerData,
      });
      setSendModalOpen(false);
      alert('CRA envoyé pour validation!');
    } catch (error) {
      console.error('Error sending CRA:', error);
      alert('Erreur lors de l\'envoi du CRA');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!confirm('Générer une facture depuis ce CRA ?')) return;

    try {
      const response = await generateInvoiceMutation.mutateAsync(id);
      alert('Facture créée avec succès!');
      navigate(`/invoicing?invoice=${response.data.invoice.id}`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Erreur lors de la génération de la facture');
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

              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                {cra.can_edit && (
                  <button
                    onClick={() => navigate(`/cra/${id}/edit`)}
                    className="btn bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
                  >
                    Modifier
                  </button>
                )}

                {cra.status === 'draft' && (
                  <>
                    <button
                      onClick={handleGeneratePDF}
                      disabled={generatePDFMutation.isLoading}
                      className="btn bg-white border-gray-200 hover:border-gray-300 text-slate-600 dark:text-slate-400"
                    >
                      {generatePDFMutation.isLoading ? 'Génération...' : 'Générer PDF'}
                    </button>

                    <button
                      onClick={() => setSendModalOpen(true)}
                      className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      Envoyer pour validation
                    </button>
                  </>
                )}

                {cra.status === 'validated' && (
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={generateInvoiceMutation.isLoading}
                    className="btn bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {generateInvoiceMutation.isLoading ? 'Génération...' : 'Générer Facture'}
                  </button>
                )}

                {cra.pdf_file && (
                  <a
                    href={cra.pdf_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn bg-white border-gray-200 hover:border-gray-300 text-slate-600 dark:text-slate-400"
                  >
                    Télécharger PDF
                  </a>
                )}

                {cra.can_delete && (
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="btn bg-white border-red-200 hover:border-red-300 text-red-600"
                  >
                    Supprimer
                  </button>
                )}
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
              disabled={deleteMutation.isLoading}
              className="btn bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Send for Validation Modal */}
      <ModalBasic
        isOpen={sendModalOpen}
        setIsOpen={setSendModalOpen}
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
              disabled={!signerData.signer_name || !signerData.signer_email || sendValidationMutation.isLoading}
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
            >
              {sendValidationMutation.isLoading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </ModalBasic>
    </div>
  );
}

export default CRADetail;
