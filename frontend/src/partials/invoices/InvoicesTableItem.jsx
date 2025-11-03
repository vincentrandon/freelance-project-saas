import React from 'react';
import DropdownEditMenu from '../../components/DropdownEditMenu';

function InvoicesTableItem(props) {

  const totalColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'text-green-500';
      case 'Due':
        return 'text-yellow-500';
      case 'Overdue':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-500/20 text-green-700';
      case 'Due':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'Overdue':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-400/20 text-gray-500 dark:text-gray-400';
    }
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'Subscription':
        return (
          <svg className="fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
            <path d="M4.3 4.5c1.9-1.9 5.1-1.9 7 0 .7.7 1.2 1.7 1.4 2.7l2-.3c-.2-1.5-.9-2.8-1.9-3.8C10.1.4 5.7.4 2.9 3.1L.7.9 0 7.3l6.4-.7-2.1-2.1zM15.6 8.7l-6.4.7 2.1 2.1c-1.9 1.9-5.1 1.9-7 0-.7-.7-1.2-1.7-1.4-2.7l-2 .3c.2 1.5.9 2.8 1.9 3.8 1.4 1.4 3.1 2 4.9 2 1.8 0 3.6-.7 4.9-2l2.2 2.2.8-6.4z" />
          </svg>
        );
      default:
        return (
          <svg className="fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
            <path d="M11.4 0L10 1.4l2 2H8.4c-2.8 0-5 2.2-5 5V12l-2-2L0 11.4l3.7 3.7c.2.2.4.3.7.3.3 0 .5-.1.7-.3l3.7-3.7L7.4 10l-2 2V8.4c0-1.7 1.3-3 3-3H12l-2 2 1.4 1.4 3.7-3.7c.4-.4.4-1 0-1.4L11.4 0z" />
          </svg>
        );
    }
  };

  return (
    <tr>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
        <div className="flex items-center">
          <label className="inline-flex">
            <span className="sr-only">Select</span>
            <input id={props.id} className="form-checkbox" type="checkbox" onChange={props.handleClick} checked={props.isChecked} />
          </label>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="font-medium text-sky-600">{props.invoice}</div>
      </td>    
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className={`font-medium ${totalColor(props.status)}`}>{props.total}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className={`inline-flex font-medium rounded-full text-center px-2.5 py-0.5 ${statusColor(props.status)}`}>{props.status}</div>
      </td >    
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="font-medium text-gray-800 dark:text-gray-100">{props.customer}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div>{props.issueddate}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div>{props.paiddate}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="flex items-center">
          {typeIcon(props.type)}
          <div>{props.type}</div>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
        <div className="flex justify-end">
          <DropdownEditMenu align="right">
            <li>
              <button
                className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex items-center py-1 px-3"
                onClick={() => console.log('View invoice:', props.id)}
              >
                <svg className="w-4 h-4 fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-2" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                </svg>
                <span>View Details</span>
              </button>
            </li>
            <li>
              <button
                className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex items-center py-1 px-3"
                onClick={() => console.log('Edit invoice:', props.id)}
              >
                <svg className="w-4 h-4 fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-2" viewBox="0 0 16 16">
                  <path d="M11.7 5.3L9 2.6l1.3-1.3c.4-.4 1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4l-1.4 1.2zM8 3.6l-6 6V13h3.4l6-6L8 3.6z" />
                </svg>
                <span>Edit</span>
              </button>
            </li>
            <li>
              <button
                className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex items-center py-1 px-3"
                onClick={() => console.log('Download invoice:', props.id)}
              >
                <svg className="w-4 h-4 fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-2" viewBox="0 0 16 16">
                  <path d="M9 4H7v4H5l3 3 3-3H9V4zm-3 8h4v1H6z" />
                </svg>
                <span>Download PDF</span>
              </button>
            </li>
            <li>
              <button
                className="font-medium text-sm text-red-500 hover:text-red-600 flex items-center py-1 px-3"
                onClick={() => console.log('Delete invoice:', props.id)}
              >
                <svg className="w-4 h-4 fill-current shrink-0 mr-2" viewBox="0 0 16 16">
                  <path d="M5 7h2v6H5V7zm4 0h2v6H9V7zm3-6v2h4v2h-1v10c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V5H0V3h4V1c0-.6.4-1 1-1h6c.6 0 1 .4 1 1zM6 2v1h4V2H6zm7 3H3v9h10V5z" />
                </svg>
                <span>Delete</span>
              </button>
            </li>
          </DropdownEditMenu>
        </div>
      </td>
    </tr>
  );
}

export default InvoicesTableItem;
