import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Rule, RuleFilters, RulesEngine } from '../lib/rulesEngine';
import { useAuthStore } from '../stores/authStore';

const ITEMS_PER_PAGE = 10;

const CustomRules = () => {
  const { session } = useAuthStore();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [newRule, setNewRule] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RuleFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    perPage: ITEMS_PER_PAGE,
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRules();
  }, [filters]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rules = await RulesEngine.listRules(filters);
      setRules(rules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchTerm, page: 1 });
  };

  const handleSort = (sortBy: RuleFilters['sortBy']) => {
    setFilters({
      ...filters,
      sortBy,
      sortOrder: filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    });
  };

  const handleSave = async (rule: Partial<Rule>) => {
    try {
      if (editingRule?.id) {
        await RulesEngine.updateRule(editingRule.id, rule);
      } else {
        await RulesEngine.saveRule({
          ...rule,
          user_id: session?.user?.id as string,
        });
      }
      await loadRules();
      setEditingRule(null);
      setNewRule(false);
      setSuccess('Rule saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingRuleId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRuleId) return;
    
    try {
      await RulesEngine.deleteRule(deletingRuleId);
      await loadRules();
      setSuccess('Rule deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    } finally {
      setDeletingRuleId(null);
    }
  };

  const RuleForm = ({ rule, onSave, onCancel }: {
    rule: Partial<Rule>;
    onSave: (rule: Partial<Rule>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(rule);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
      const errors: Record<string, string> = {};
      if (!formData.contents?.trim()) {
        errors.contents = 'Contents are required';
      }
      return errors;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const errors = validateForm();
      if (Object.keys(errors).length === 0) {
        onSave(formData);
      } else {
        setFormErrors(errors);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contents *
            </label>
            <textarea
              value={formData.contents || ''}
              onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md ${
                formErrors.contents ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.contents && (
              <p className="mt-1 text-sm text-red-500">{formErrors.contents}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Rule
            </button>
          </div>
        </div>
      </form>
    );
  };

  const DeleteConfirmationDialog = () => {
    if (!deletingRuleId) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Delete Confirmation</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this rule? This action will deactivate the rule.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingRuleId(null)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Custom Rules</h1>
        <button
          onClick={() => setNewRule(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusCircle size={20} />
          <span>New Rule</span>
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

      <div className="bg-white shadow-md rounded-lg mb-6">
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Search
            </button>
          </form>
        </div>

        {newRule && (
          <RuleForm
            rule={{}}
            onSave={handleSave}
            onCancel={() => setNewRule(false)}
          />
        )}

        {editingRule && (
          <RuleForm
            rule={editingRule}
            onSave={handleSave}
            onCancel={() => setEditingRule(null)}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('contents')}
                    className="flex items-center space-x-1"
                  >
                    <span>Contents</span>
                    {filters.sortBy === 'contents' && (
                      filters.sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1"
                  >
                    <span>Created</span>
                    {filters.sortBy === 'created_at' && (
                      filters.sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    No rules found
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{rule.contents}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(rule.created_at!).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(rule.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationDialog />
    </div>
  );
};

export default CustomRules;