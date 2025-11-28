import React, { useState } from 'react';
import { Category } from '../types';
import { ChevronRight, ChevronDown, X } from 'lucide-react';

interface CategorySidebarProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (id: string) => void;
  activeCategoryId: string | null;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({ 
  categories, 
  isOpen, 
  onClose,
  onSelectCategory,
  activeCategoryId
}) => {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expanded.includes(id)) {
      setExpanded(expanded.filter(catId => catId !== id));
    } else {
      setExpanded([...expanded, id]);
    }
  };

  const renderCategory = (category: Category, depth = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expanded.includes(category.id);
    const isActive = activeCategoryId === category.id;

    return (
      <div key={category.id} className="select-none">
        <div 
          className={`
            flex items-center justify-between py-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors
            ${isActive ? 'text-brand-blue font-medium bg-blue-50' : 'text-gray-700'}
          `}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
          onClick={() => onSelectCategory(category.id)}
        >
          <span className="text-sm">{category.name}</span>
          {hasChildren && (
            <button 
              onClick={(e) => toggleExpand(category.id, e)}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-100 ml-4">
            {category.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          md:translate-x-0 md:static md:shadow-none md:z-0 md:h-screen md:sticky md:top-32 md:border-r border-gray-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 md:hidden bg-brand-dark text-white">
          <span className="font-bold text-lg">Categories</span>
          <button onClick={onClose} className="text-gray-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-2 md:p-0 md:pt-4 overflow-y-auto h-full max-h-[calc(100vh-60px)] no-scrollbar">
          <h3 className="hidden md:block px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            All Categories
          </h3>
          {categories.map(cat => renderCategory(cat))}
        </div>
      </aside>
    </>
  );
};

export default CategorySidebar;