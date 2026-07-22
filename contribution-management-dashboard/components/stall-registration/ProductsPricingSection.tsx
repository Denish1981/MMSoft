import React from 'react';
import type { StallRegistrationProduct } from '../../types/index';
import { PlusIcon } from '../icons/PlusIcon';
import { DeleteIcon } from '../icons/DeleteIcon';

interface ProductsPricingSectionProps {
    products: Partial<StallRegistrationProduct>[];
    onProductChange: (index: number, field: keyof StallRegistrationProduct, value: string) => void;
    onAddProduct: () => void;
    onRemoveProduct: (index: number) => void;
}

export const ProductsPricingSection: React.FC<ProductsPricingSectionProps> = ({
    products,
    onProductChange,
    onAddProduct,
    onRemoveProduct,
}) => {
    return (
        <fieldset>
            <legend className="text-lg font-semibold text-slate-700 mb-2">Products & Pricing *</legend>
            <div className="space-y-2 mt-1">
                {products.map((p, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="text" placeholder="Product Name" value={p.productName || ''} onChange={e => onProductChange(index, 'productName', e.target.value)} className="w-full input-style" />
                        <input type="number" placeholder="Price (₹)" value={p.price || ''} onChange={e => onProductChange(index, 'price', e.target.value)} className="w-40 input-style" min="0" />
                        {products.length > 1 && (
                            <button type="button" onClick={() => onRemoveProduct(index)} className="text-red-500 hover:text-red-700">
                                <DeleteIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <button type="button" onClick={onAddProduct} className="mt-2 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                <PlusIcon className="w-4 h-4 mr-1"/> Add Product
            </button>
        </fieldset>
    );
};
