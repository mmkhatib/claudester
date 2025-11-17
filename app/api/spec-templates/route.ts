import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  parseSearchParams,
  withErrorHandling,
  notFoundError,
} from '@/lib/api-utils';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getCategories,
} from '@/backend/services/spec-templates';

/**
 * GET /api/spec-templates
 * Get spec templates (optionally filtered by category)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission('SPEC_VIEW');

  const params = parseSearchParams(request);
  const { category, id } = params;

  // Get specific template by ID
  if (id) {
    const template = getTemplateById(id);
    if (!template) {
      return notFoundError('Template');
    }
    return successResponse(template);
  }

  // Get templates by category
  if (category) {
    const templates = getTemplatesByCategory(category);
    return successResponse({
      templates,
      category,
      count: templates.length,
    });
  }

  // Get all templates
  const templates = getAllTemplates();
  const categories = getCategories();

  return successResponse({
    templates,
    categories,
    count: templates.length,
  });
});
