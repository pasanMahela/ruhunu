import React from 'react';

const Bill = ({ saleData }) => {
  if (!saleData) return null;
  const saleDate = new Date().toLocaleString();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto border-2 border-blue-200">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Sales Bill</h2>
        <p className="text-gray-600 text-sm">Date: {saleDate}</p>
      </div>
      <div className="mb-4">
        <p><span className="font-semibold">Customer:</span> {saleData.customerName}</p>
        <p><span className="font-semibold">Payment Method:</span> {saleData.paymentMethod.toUpperCase()}</p>
        <p><span className="font-semibold">Amount Paid:</span> Rs. {saleData.amountPaid.toFixed(2)}</p>
        <p><span className="font-semibold">Change:</span> Rs. {saleData.balance.toFixed(2)}</p>
      </div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b-2 border-blue-200">
            <th className="py-1 text-left text-gray-700">Item</th>
            <th className="py-1 text-right text-gray-700">Qty</th>
            <th className="py-1 text-right text-gray-700">Price</th>
            <th className="py-1 text-right text-gray-700">Disc</th>
            <th className="py-1 text-right text-gray-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {saleData.items.map((item, idx) => (
            <tr key={idx} className="border-b border-blue-100 last:border-b-0">
              <td className="py-1 text-gray-700">{item.name}</td>
              <td className="py-1 text-right text-gray-700">{item.quantity}</td>
              <td className="py-1 text-right text-gray-700">Rs. {item.price.toFixed(2)}</td>
              <td className="py-1 text-right text-gray-700">{item.discount}%</td>
              <td className="py-1 text-right text-gray-700">Rs. {item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t-2 border-blue-200 pt-3 mb-2">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal:</span>
          <span>Rs. {saleData.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Total Discount:</span>
          <span>Rs. {(saleData.subtotal - saleData.total).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-lg">
          <span>Grand Total:</span>
          <span>Rs. {saleData.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="text-center text-xs text-gray-600 mt-4">
        <p>Thank you for your purchase!</p>
        <p>Please come again</p>
      </div>
    </div>
  );
};

export default Bill; 