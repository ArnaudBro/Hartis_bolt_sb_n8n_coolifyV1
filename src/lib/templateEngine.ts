import { supabase } from './supabase';

export interface Template {
  id: string;
  user_id: string;
  title: string;
  contents: string;
  specific_instructions?: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateVariable {
  name: string;
  value: string;
}

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class TemplateEngine {
  private static readonly MAX_NESTED_DEPTH = 5;
  private static readonly VARIABLE_REGEX = /\{\{(.*?)\}\}/g;
  private static readonly CONDITION_REGEX = /\{%\s*if\s+(.*?)\s*%\}(.*?)(?:\{%\s*else\s*%\}(.*?))?\{%\s*endif\s*%\}/gs;
  private static readonly LOOP_REGEX = /\{%\s*for\s+(.*?)\s+in\s+(.*?)\s*%\}(.*?)\{%\s*endfor\s*%\}/gs;

  static async loadTemplate(templateId: string): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      throw new TemplateError(`Failed to load template: ${error.message}`);
    }

    return data as Template;
  }

  static async saveTemplate(template: Partial<Template>): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .insert([{ ...template, status: true }])
      .select()
      .single();

    if (error) {
      throw new TemplateError(`Failed to save template: ${error.message}`);
    }

    return data as Template;
  }

  static async updateTemplate(templateId: string, updates: Partial<Template>): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new TemplateError(`Failed to update template: ${error.message}`);
    }

    return data as Template;
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .update({ status: false })
      .eq('id', templateId);

    if (error) {
      throw new TemplateError(`Failed to delete template: ${error.message}`);
    }
  }

  static async listTemplates(): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('status', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new TemplateError(`Failed to list templates: ${error.message}`);
    }

    return data as Template[];
  }

  static render(template: string, variables: Record<string, any>, depth = 0): string {
    if (depth > this.MAX_NESTED_DEPTH) {
      throw new TemplateError('Maximum template nesting depth exceeded');
    }

    // Process conditions
    template = this.processConditions(template, variables);

    // Process loops
    template = this.processLoops(template, variables);

    // Process variables
    template = this.processVariables(template, variables);

    return template;
  }

  private static processVariables(template: string, variables: Record<string, any>): string {
    return template.replace(this.VARIABLE_REGEX, (match, variableName) => {
      const trimmedName = variableName.trim();
      if (!(trimmedName in variables)) {
        throw new TemplateError(`Undefined variable: ${trimmedName}`);
      }
      return String(variables[trimmedName]);
    });
  }

  private static processConditions(template: string, variables: Record<string, any>): string {
    return template.replace(this.CONDITION_REGEX, (match, condition, ifBlock, elseBlock = '') => {
      try {
        const result = this.evaluateCondition(condition.trim(), variables);
        return result ? ifBlock : elseBlock;
      } catch (error) {
        throw new TemplateError(`Invalid condition: ${condition}`);
      }
    });
  }

  private static processLoops(template: string, variables: Record<string, any>): string {
    return template.replace(this.LOOP_REGEX, (match, itemName, arrayName, block) => {
      const array = variables[arrayName.trim()];
      if (!Array.isArray(array)) {
        throw new TemplateError(`Invalid loop array: ${arrayName}`);
      }

      return array
        .map(item => {
          const loopVariables = { ...variables, [itemName.trim()]: item };
          return this.render(block, loopVariables, 1);
        })
        .join('');
    });
  }

  private static evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple evaluation for basic conditions
    const parts = condition.split(/\s*(===|!==|==|!=|>=|<=|>|<)\s*/);
    if (parts.length !== 3) {
      return Boolean(variables[condition] || false);
    }

    const [left, operator, right] = parts;
    const leftValue = variables[left] ?? left;
    const rightValue = variables[right] ?? right;

    switch (operator) {
      case '===':
      case '==':
        return leftValue == rightValue;
      case '!==':
      case '!=':
        return leftValue != rightValue;
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
      default:
        throw new TemplateError(`Unsupported operator: ${operator}`);
    }
  }
}