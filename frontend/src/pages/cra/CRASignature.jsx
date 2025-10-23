import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCRASignature, useSignCRA, useDeclineCRA } from '../../api/hooks';

function CRASignature() {
  const { token } = useParams();
  const navigate = useNavigate();

  const { data: signatureData, isLoading, error } = useCRASignature(token);
  const signMutation = useSignCRA();
  const declineMutation = useDeclineCRA();

  const [signatureMethod, setSignatureMethod] = useState('type');
  const [typedName, setTypedName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  const cra = signatureData?.data?.cra;
  const signatureRequest = signatureData?.data?.signature_request;

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const handleSign = async () => {
    if (!typedName.trim()) {
      alert('Veuillez entrer votre nom');
      return;
    }

    try {
      await signMutation.mutateAsync({
        token,
        signature_method: signatureMethod,
        signature_data: {
          typed_name: typedName,
        },
      });

      setIsSigned(true);
    } catch (error) {
      console.error('Error signing CRA:', error);
      alert('Erreur lors de la signature');
    }
  };

  const handleDecline = async () => {
    if (!confirm('Êtes-vous sûr de vouloir refuser ce CRA ?')) return;

    try {
      await declineMutation.mutateAsync({
        token,
        reason: declineReason,
      });

      alert('CRA refusé');
      setShowDeclineForm(false);
    } catch (error) {
      console.error('Error declining CRA:', error);
      alert('Erreur lors du refus');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900/50">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !cra) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lien invalide ou expiré</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Ce lien de signature n'est plus valide ou a expiré.
          </p>
        </div>
      </div>
    );
  }

  if (isSigned || signatureRequest?.status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">CRA signé avec succès!</h2>
          <p className="text-gray-600 mb-4">
            Le compte rendu d'activité a été validé. Le prestataire recevra une confirmation par email.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vous pouvez fermer cette fenêtre.
          </p>
        </div>
      </div>
    );
  }

  if (signatureRequest?.status === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">CRA refusé</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Ce compte rendu d'activité a été refusé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Signature de Compte Rendu d'Activité</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Veuillez vérifier les informations et signer ce CRA
          </p>
        </div>

        {/* CRA Details */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              CRA {monthNames[cra.period_month - 1]} {cra.period_year}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Client & Provider Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Prestataire</h3>
                <div className="text-slate-800 dark:text-slate-100">
                  <div className="font-medium">{cra.customer.name}</div>
                  {cra.customer.company && <div className="text-sm text-slate-600 dark:text-slate-400">{cra.customer.company}</div>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Client</h3>
                <div className="text-slate-800 dark:text-slate-100">
                  <div className="font-medium">{signatureRequest.signer_name}</div>
                  {signatureRequest.signer_company && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">{signatureRequest.signer_company}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Période</div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">
                    {monthNames[cra.period_month - 1]} {cra.period_year}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Nombre de tâches</div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{cra.tasks.length}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Total jours</div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{cra.total_days}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Montant HT</div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(cra.total_amount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Détail des tâches</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tâche</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Jours</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cra.tasks.map((task) => (
                      <tr key={task.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-100">{task.name}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-100">{task.worked_days}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(
                            task.worked_days * cra.daily_rate
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">Total</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">{cra.total_days}</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600 text-lg">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(cra.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {cra.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{cra.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Signature Section */}
        {!showDeclineForm ? (
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature électronique</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre nom complet *
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  En signant ce document, vous confirmez avoir lu et approuvé les informations ci-dessus.
                  Votre signature électronique a la même valeur légale qu'une signature manuscrite.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSign}
                  disabled={!typedName.trim() || signMutation.isLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {signMutation.isLoading ? 'Signature en cours...' : 'Signer et Valider'}
                </button>

                <button
                  onClick={() => setShowDeclineForm(true)}
                  className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 transition-colors"
                >
                  Refuser
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Refuser ce CRA</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du refus (optionnel)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Expliquez pourquoi vous refusez ce CRA..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  disabled={declineMutation.isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {declineMutation.isLoading ? 'Refus en cours...' : 'Confirmer le refus'}
                </button>

                <button
                  onClick={() => setShowDeclineForm(false)}
                  className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Ce document est généré électroniquement et ne nécessite pas de signature manuscrite.</p>
        </div>

      </div>
    </div>
  );
}

export default CRASignature;
