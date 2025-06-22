import React from 'react';

const Bill = ({ saleData }) => {
  if (!saleData) return null;
  const saleDate = new Date().toLocaleString();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Sales Bill</h2>
        <p className="text-slate-500 text-sm">Date: {saleDate}</p>
      </div>
      <div className="mb-4">
        <p><span className="font-semibold">Customer:</span> {saleData.customerName}</p>
        <p><span className="font-semibold">Payment Method:</span> {saleData.paymentMethod.toUpperCase()}</p>
        <p><span className="font-semibold">Amount Paid:</span> Rs. {saleData.amountPaid.toFixed(2)}</p>
        <p><span className="font-semibold">Change:</span> Rs. {saleData.balance.toFixed(2)}</p>
      </div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Disc</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {saleData.items.map((item, idx) => (
            <tr key={idx} className="border-b last:border-b-0">
              <td className="py-1">{item.name}</td>
              <td className="py-1 text-right">{item.quantity}</td>
              <td className="py-1 text-right">Rs. {item.price.toFixed(2)}</td>
              <td className="py-1 text-right">{item.discount}%</td>
              <td className="py-1 text-right">Rs. {item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t pt-3 mb-2">
        <div className="flex justify-between text-slate-700">
          <span>Subtotal:</span>
          <span>Rs. {saleData.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Total Discount:</span>
          <span>Rs. {(saleData.subtotal - saleData.total).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 text-lg">
          <span>Grand Total:</span>
          <span>Rs. {saleData.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="text-center text-xs text-slate-500 mt-4">
        <p>Thank you for your purchase!</p>
        <p>Please come again</p>
      </div>
    </div>
  );
};

export default Bill; 