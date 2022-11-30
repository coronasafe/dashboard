import { useState } from "react";
import { Button, Dropdown, DropdownItem } from "@windmill/react-ui";
import { ChevronDown } from "react-feather";

const SortByWidget = ({ orderBy, setOrderBy, selectors, selectorMapping }) => {
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [widgetInfo, setWidgetInfo] = useState("Last Updated");

  const handleDropdownSelect = (selector) => {
    setOrderBy({ ...orderBy, selector: selectorMapping(selector) });
    setWidgetInfo(selector);
    setWidgetOpen(false);
  };

  return (
    <div>
      <div className="flex flex-row">
        <div className="relative ml-1 h-10 dark:bg-gray-900 bg-white rounded-lg">
          <Button
            layout="link"
            onClick={() => setWidgetOpen(true)}
            className="dark:bg-gray-800"
            iconRight={ChevronDown}
            disabled={widgetOpen}
          >
            {`Sorted By: ${widgetInfo}`}
          </Button>
          <Dropdown
            isOpen={widgetOpen}
            onClose={() => setWidgetOpen(false)}
            align="left"
            className="absolute"
          >
            {selectors.map((selector, idx) => (
              <DropdownItem
                key={idx}
                className=""
                onClick={() => handleDropdownSelect(selector)}
              >
                {selector}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
        <div className="flex justify-evenly ml-10 w-1/4 dark:text-gray-700 dark:bg-gray-900 bg-white rounded-lg">
          <Button
            layout="link"
            onClick={() => setOrderBy({ ...orderBy, order: 1 })}
            className={`${
              orderBy.order === 1 ? "border-r-2 border-gray-900" : ""
            } bg-gray-800 rounded-r-none shadow-xs`}
            disabled={orderBy.order === 1 ? true : false}
          >
            <span>ASC</span>
          </Button>
          <Button
            layout="link"
            onClick={() => setOrderBy({ ...orderBy, order: -1 })}
            className={`${
              orderBy.order === -1 ? "border-l-2 border-gray-900" : ""
            } bg-gray-800 rounded-l-none shadow-xs`}
            disabled={orderBy.order === 1 ? false : true}
          >
            <span>DESC</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortByWidget;
