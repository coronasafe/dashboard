import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useMemo, useState, useEffect } from "react";
import useSWR from "swr";

import { careSummary } from "../../utils/api";
import {
  OXYGEN_TYPES,
  OXYGEN_INVENTORY,
  OXYGEN_INVENTORY_NAME,
  OXYGEN_CAPACITY_TRANSLATION,
  OXYGEN_TYPES_KEYS,
} from "../../utils/constants";
import {
  dateString,
  getNDateAfter,
  getNDateBefore,
  processFacilities,
} from "../../utils/utils";
import { OxygenCard } from "../Cards/OxygenCard";
import { SectionTitle } from "../Typography/Title";
import { CSVLink } from "react-csv";
import Pagination from "../Pagination";
import { Button, Input } from "@windmill/react-ui";
import fuzzysort from "fuzzysort";

import SortByWidget from "../SortByWidget/SortByWidget";

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

const stockSummary = (oxygenFlatData, key) => {
  const entries = oxygenFlatData.filter((f) => f.item_name === key);
  const stock = entries.map((p) => p.stock).reduce((a, b) => a + b, 0);
  const valid_entries = entries.filter(
    (a) => (a?.burn_rate || 0) !== 0 && (a?.burn_rate || null) !== null
  );
  const depleted_entries = valid_entries.filter((a) => a.stock === 0);
  const valid_nonzero_entries = valid_entries.filter((a) => a.stock !== 0);
  const burn_rate = valid_nonzero_entries
    .map((p) => p.burn_rate)
    .reduce((acc, iter) => acc + iter, 0);
  const facilities_with_less_than_5_hrs_of_oxygen = valid_nonzero_entries
    .map((p) => p.stock / p.burn_rate)
    .filter((f) => f < 5);

  return (
    <div
      key={key}
      className="md-space-y-0 gap-4 grid-cols-4 my-4 p-4 min-w-0 text-gray-800 dark:text-white dark:bg-gray-800 bg-white rounded-lg shadow-xs overflow-hidden space-y-4 md:grid"
    >
      <div className="flex items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="weight"
            className="pr-4 w-12 h-12 text-orange-500"
            role="img"
            viewBox="0 0 512 512"
          >
            <path
              fill="currentColor"
              d="M448 64h-25.98C438.44 92.28 448 125.01 448 160c0 105.87-86.13 192-192 192S64 265.87 64 160c0-34.99 9.56-67.72 25.98-96H64C28.71 64 0 92.71 0 128v320c0 35.29 28.71 64 64 64h384c35.29 0 64-28.71 64-64V128c0-35.29-28.71-64-64-64zM256 320c88.37 0 160-71.63 160-160S344.37 0 256 0 96 71.63 96 160s71.63 160 160 160zm-.3-151.94l33.58-78.36c3.5-8.17 12.94-11.92 21.03-8.41 8.12 3.48 11.88 12.89 8.41 21l-33.67 78.55C291.73 188 296 197.45 296 208c0 22.09-17.91 40-40 40s-40-17.91-40-40c0-21.98 17.76-39.77 39.7-39.94z"
            />
          </svg>
        </div>
        <div className="">
          <div>{key}</div>
          <div className="text-3xl font-bold">
            {stock - Math.floor(stock) !== 0 ? stock.toFixed(2) : stock}
          </div>
          <div className="mt-1 text-sm">{entries[0]?.unit}</div>
        </div>
      </div>

      <div className="flex items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="fire"
            className="pr-4 w-12 h-12 text-orange-500"
            role="img"
            viewBox="0 0 384 512"
          >
            <path
              fill="currentColor"
              d="M216 23.86c0-23.8-30.65-32.77-44.15-13.04C48 191.85 224 200 224 288c0 35.63-29.11 64.46-64.85 63.99-35.17-.45-63.15-29.77-63.15-64.94v-85.51c0-21.7-26.47-32.23-41.43-16.5C27.8 213.16 0 261.33 0 320c0 105.87 86.13 192 192 192s192-86.13 192-192c0-170.29-168-193-168-296.14z"
            />
          </svg>
        </div>
        <div>
          <div>Burn Rate</div>
          <div className="text-3xl font-bold">{burn_rate?.toFixed(2)}</div>
          <div className="mt-1 text-sm">{entries[0]?.unit} / hour </div>
        </div>
      </div>
      <div className="flex items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="currentColor"
            className="pr-4 w-12 h-12 text-orange-500"
            viewBox="0 0 16 16"
          >
            <path d="M6.5 0a.5.5 0 0 0 0 1H7v1.07A7.001 7.001 0 0 0 8 16a7 7 0 0 0 5.29-11.584.531.531 0 0 0 .013-.012l.354-.354.353.354a.5.5 0 1 0 .707-.707l-1.414-1.415a.5.5 0 1 0-.707.707l.354.354-.354.354a.717.717 0 0 0-.012.012A6.973 6.973 0 0 0 9 2.071V1h.5a.5.5 0 0 0 0-1h-3zm2 5.6V9a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1 0-1h3V5.6a.5.5 0 1 1 1 0z" />
          </svg>
        </div>
        <div>
          <div>Time to Empty</div>
          {burn_rate > 0 ? (
            <>
              <div className="text-3xl font-bold">
                {(stock / burn_rate).toFixed(2)}
              </div>
              <div className="mt-1 text-sm">hours</div>
            </>
          ) : (
            <div className="text-gray-600 text-2xl">N/A</div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="exclamation-triangle"
            className="pr-4 w-12 h-12 text-orange-500"
            role="img"
            viewBox="0 0 576 512"
          >
            <path
              fill="currentColor"
              d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"
            />
          </svg>
        </div>
        <div>
          <div>High Alerts</div>
          <div className="text-3xl font-bold">
            {facilities_with_less_than_5_hrs_of_oxygen.length}
          </div>
          <div className="mt-1 text-sm">Facilities</div>
        </div>
      </div>
    </div>
  );
};

const getCardData = (facility) => {
  const last_updated = [];
  const quantity = [];
  const burn_rate = [];
  const time_to_empty = [];
  const quantity_unit = [];
  const is_low = [];
  Object.values(OXYGEN_INVENTORY).forEach((id) => {
    if (!facility.inventory[id]) {
      last_updated.push(null);
      quantity.push(null);
      burn_rate.push(null);
      time_to_empty.push(null);
      quantity_unit.push(null);
      is_low.push(null);
    } else {
      last_updated.push(
        dayjs(new Date(facility.inventory[id]?.modified_date)).fromNow()
      );

      const quantity_info = `${facility.inventory[id]?.stock?.toFixed(2)} / ${
        OXYGEN_TYPES_KEYS[id] === "liquid"
          ? (
              facility[OXYGEN_CAPACITY_TRANSLATION[OXYGEN_TYPES_KEYS[id]]] *
              0.8778
            ).toFixed(2)
          : facility[OXYGEN_CAPACITY_TRANSLATION[OXYGEN_TYPES_KEYS[id]]]
      }`;
      quantity.push(quantity_info);

      quantity_unit.push(facility.inventory[id]?.unit);

      burn_rate.push(
        facility.inventory[id]?.burn_rate > 0
          ? facility.inventory[id]?.burn_rate?.toFixed(2)
          : ""
      );

      const time_info =
        facility.inventory[id]?.burn_rate > 0
          ? (
              facility.inventory[id]?.stock / facility.inventory[id]?.burn_rate
            ).toFixed(2)
          : "";
      time_to_empty.push(time_info);

      is_low.push(facility.inventory[id]?.is_low);
    }
  });

  return {
    last_updated: last_updated,
    quantity: quantity,
    burn_rate: burn_rate,
    time_to_empty: time_to_empty,
    quantity_unit: quantity_unit,
    is_low: is_low,
  };
};

const oxygenSelector = (selector) => {
  switch (selector.toLowerCase()) {
    case "last updated":
      return "inventoryModifiedDate";
    case "liquid oxygen":
      return "tte_tank";
    case "cylinder b":
      return "tte_b_cylinders";
    case "cylinder c":
      return "tte_c_cylinders";
    case "cylinder d":
      return "tte_d_cylinders";
    default:
      return null;
  }
};

function OxygenMonitor({ filterDistrict, filterFacilityTypes, date }) {
  const [orderBy, setOrderBy] = useState({
    selector: oxygenSelector("Last Updated"),
    order: 1,
  });

  const { data } = useSWR(
    ["OxygenMonitor", date, filterDistrict.id],
    (url, date, district) =>
      careSummary(
        "facility",
        dateString(getNDateBefore(date, 1)),
        dateString(getNDateAfter(date, 1)),
        district
      )
  );
  const { oxygenCardData, oxygenFlatData, exported } = useMemo(() => {
    const filtered = processFacilities(
      data.results,
      filterFacilityTypes,
      orderBy
    );

    const oxygenCardData = filtered.reduce((acc, facility) => {
      if (facility.date === dateString(date)) {
        if (
          facility.inventory &&
          Object.keys(facility.inventory).length !== 0 &&
          Object.keys(facility.inventory).some((key) =>
            Object.values(OXYGEN_INVENTORY).includes(Number(key))
          )
        ) {
          return [
            ...acc,
            {
              facility_id: facility.id,
              facility_name: facility.name,
              facility_type: facility.facilityType,
              phone_number: facility.phoneNumber,
              facility_last_updated: dayjs(
                new Date(facility.inventoryModifiedDate)
              ).fromNow(),
              ...getCardData(facility),
            },
          ];
        }
        return acc;
      }
      return acc;
    }, []);

    const oxygenFlatData = filtered
      .map((c) => {
        if (
          c.date === dateString(date) &&
          c.inventory &&
          Object.keys(c.inventory).length !== 0 &&
          Object.keys(c.inventory).some((e) =>
            Object.values(OXYGEN_INVENTORY).includes(Number(e))
          )
        ) {
          return Object.values(c.inventory);
        }
      })
      .filter((element) => {
        return element !== undefined;
      })
      .flat();

    const exported = {
      data: filtered.reduce((a, c) => {
        if (c.date !== dateString(date)) {
          return a;
        }

        if (
          !(
            c.inventory &&
            Object.keys(c.inventory).length !== 0 &&
            Object.keys(c.inventory).some((e) =>
              Object.values(OXYGEN_INVENTORY).includes(Number(e))
            )
          )
        ) {
          return a;
        }

        return [
          ...a,
          {
            "Govt/Pvt": c.facilityType,
            "Hops/CFLTC":
              c.facilityType === "First Line Treatment Centre"
                ? "CFLTC"
                : "Hops",
            "Hospital/CFLTC Address": c.address,
            "Hospital/CFLTC Name": c.name,
            Mobile: c.phoneNumber,
            "Expected Liquid Oxygen": c.expected_oxygen_requirement,
            "Expected Type B Cylinders": c.expected_type_b_cylinders,
            "Expected Type C Cylinders": c.expected_type_c_cylinders,
            "Expected Type D Cylinders": c.expected_type_d_cylinders,
            "Capacity Liquid Oxygen": c.oxygenCapacity,
            "Capacity Type B Cylinders": c.type_b_cylinders,
            "Capacity Type C Cylinders": c.type_c_cylinders,
            "Capacity Type D Cylinders": c.type_d_cylinders,
            ...Object.values(OXYGEN_INVENTORY).reduce((t, x) => {
              const y = { ...t };

              if (c.inventory[x]?.item_name) {
                y[`Opening Stock ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.start_stock || 0;
                y[`Stock Added Today ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.total_added || 0;
                y[`Closing Stock ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.end_stock || 0;
                y[`Total Consumed ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.total_consumed || 0;
                y[`Current Stock ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.stock || 0;
                y[`Unit ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.unit || 0;
                y[`Is Low ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.is_low || 0;
                y[`Burn Rate ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.burn_rate || 0;
                y[`Updated at ${c.inventory[x]?.item_name}`] =
                  c.inventory[x]?.modified_date || 0;
              }
              return y;
            }, {}),
          },
        ];
      }, []),
      filename: "oxygen_export.csv",
    };

    return { oxygenCardData, oxygenFlatData, exported };
  }, [data, filterFacilityTypes, orderBy]);

  const [filteredData, setFilteredData] = useState(oxygenCardData);
  const [tableData, setTableData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const resultsPerPage = 10;

  useEffect(() => {
    const debounce_timer = setTimeout(() => {
      setFilteredData(
        searchTerm
          ? oxygenCardData.filter((v) =>
              fuzzysort
                .go(
                  searchTerm,
                  oxygenCardData.map((d) => ({ ...d, 0: d.facility_name })),
                  { key: "0" }
                )
                .map((v) => v.target)
                .includes(v.facility_name)
            )
          : oxygenCardData
      );
      setPage(0);
    }, 1000);
    return () => clearTimeout(debounce_timer);
  }, [searchTerm, oxygenCardData]);

  useEffect(() => {
    setTableData(
      filteredData.slice(page * resultsPerPage, (page + 1) * resultsPerPage)
    );
  }, [filteredData, page]);

  return (
    <>
      <div>
        <h1 className="mt-6 dark:text-white text-3xl font-semibold">
          District Summary
        </h1>
        {Object.values(OXYGEN_INVENTORY_NAME).map((n) =>
          stockSummary(oxygenFlatData, n)
        )}
      </div>

      <div id="facility-oxygen-cards" className="mb-16 mt-16">
        <SectionTitle>Facilities</SectionTitle>
        <div className="flex flex-col items-center justify-between md:flex-row">
          <SortByWidget
            orderBy={orderBy}
            setOrderBy={(state) => setOrderBy(state)}
            selectors={["Last Updated", ...Object.values(OXYGEN_TYPES)]}
            selectorMapping={oxygenSelector}
          />
          <div className="flex max-w-full space-x-4">
            {exported && (
              <CSVLink data={exported.data} filename={exported.filename}>
                <Button block>Export</Button>
              </CSVLink>
            )}
            <Input
              className="sw-40 rounded-lg sm:w-auto"
              placeholder="Search Facility"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        {tableData.map((data) => (
          <OxygenCard data={data} key={data.id} />
        ))}

        <Pagination
          resultsPerPage={resultsPerPage}
          totalResults={filteredData.length}
          currentPage={page}
          currentResults={tableData.length}
          handlePageClick={setPage}
        />
      </div>
    </>
  );
}

export default OxygenMonitor;
