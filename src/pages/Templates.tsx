import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';
import { Template, TemplateEngine } from '../lib/templateEngine';
import { useAuthStore } from '../stores/authStore';
import RichTextEditor from '../components/RichTextEditor';

const Templates = () => {
  const { session } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templates = await TemplateEngine.listTemplates();
      setTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du chargement des templates');
    }
  };

  const handleSave = async (template: Partial<Template>) => {
    try {
      if (editingTemplate?.id) {
        await TemplateEngine.updateTemplate(editingTemplate.id, template);
      } else {
        await TemplateEngine.saveTemplate({
          ...template,
          user_id: session?.user?.id as string,
        });
      }
      await loadTemplates();
      setEditingTemplate(null);
      setNewTemplate(false);
      setSuccess('Le template a été sauvegardé avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la sauvegarde du template');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingTemplateId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTemplateId) return;
    
    try {
      await TemplateEngine.deleteTemplate(deletingTemplateId);
      await loadTemplates();
      setSuccess('Le template a été supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la suppression du template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const TemplateForm = ({ template, onSave, onCancel }: {
    template: Partial<Template>;
    onSave: (template: Partial<Template>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(template);

    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenu du Template
            </label>
            <RichTextEditor
              value={formData.contents || ''}
              onChange={(value) => setFormData({ ...formData, contents: value })}
              placeholder="Commencez à écrire votre template ici..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions Spécifiques
            </label>
            <textarea
              value={formData.specific_instructions || ''}
              onChange={(e) => setFormData({ ...formData, specific_instructions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => onCancel()}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmationDialog = () => {
    if (!deletingTemplateId) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Confirmation de suppression</h3>
          <p className="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingTemplateId(null)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates de Rapport</h1>
        <button
          onClick={() => setNewTemplate(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusCircle size={20} />
          <span>Nouveau Template</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {newTemplate && (
        <TemplateForm
          template={{}}
          onSave={handleSave}
          onCancel={() => setNewTemplate(false)}
        />
      )}

      {editingTemplate && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleSave}
          onCancel={() => setEditingTemplate(null)}
        />
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white shadow-md rounded-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">{template.title}</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-2 text-gray-600 hover:text-blue-600"
                  title="Modifier"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => handleDeleteClick(template.id)}
                  className="p-2 text-gray-600 hover:text-red-600"
                  title="Supprimer"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <div 
                className="bg-gray-50 p-4 rounded-md overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: template.contents || '' }}
              />
              
              {template.specific_instructions && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700">Instructions :</h3>
                  <p className="text-gray-600">{template.specific_instructions}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmationDialog />
    </div>
  );
};

export default Templates;