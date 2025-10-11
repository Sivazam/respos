import React from 'react';
import { Category } from '../../types';
import { Edit2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onEdit,
  onDelete
}) => {
  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {category.name}
              </h3>
              {category.description && (
                <p className="mt-1 text-sm text-gray-500">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(category)}
                className="inline-flex items-center"
              >
                <Edit2 size={16} className="mr-1" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(category)}
                className="inline-flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;