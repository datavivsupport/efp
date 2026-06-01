import React, { useState, createContext, useContext, useEffect, useMemo, useRef } from "react";
import { Table } from "antd";
import "./InvoiceTable.scss";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";

import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";

/* Drag Context */
const DragIndexContext = createContext({
  active: -1,
  over: -1,
});

const dragActiveStyle = (dragState, id) => {
  const { active, over } = dragState;
  if (active === id) return { backgroundColor: "#f0f0f0", opacity: 0.6 };
  if (over === id && active !== over) return { borderInlineStart: "2px dashed #999" };
  return {};
};

/* Draggable Header Cell */
const TableHeaderCell = ({ id, ...props }) => {
  const dragState = useContext(DragIndexContext);
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });

  return (
    <th
      ref={setNodeRef}
      {...props}
      {...attributes}
      {...listeners}
      style={{
        ...props.style,
        cursor: "move",
        userSelect: "none",
        ...(isDragging ? { zIndex: 99, position: "relative" } : {}),
        ...dragActiveStyle(dragState, id),
      }}
    />
  );
};

/* Draggable Body Cell */
const TableBodyCell = ({ id, ...props }) => {
  const dragState = useContext(DragIndexContext);
  return <td {...props} style={{ ...props.style, ...dragActiveStyle(dragState, id) }} />;
};

/* Common Table */
function CommonTable({
  columns,
  data,
  loading = false,
  onTableChange = () => {},
  page = 1,
  total = 0,
  pagesize = 10,
  rowClassName,
  yescomp = false,
  onRow,
}) {
  const [cols, setCols] = useState([]);
  const [dragIndex, setDragIndex] = useState({ active: -1, over: -1 });
  const [currentPage, setCurrentPage] = useState(page);
  const [currentPageSize, setCurrentPageSize] = useState(pagesize);

  useEffect(() => { setCurrentPage(page); }, [page]);
  useEffect(() => { setCurrentPageSize(pagesize); }, [pagesize]);

  const topScrollRef = useRef(null);
  const tableWrapperRef = useRef(null);

  const buildColumns = useMemo(() => {
    return columns.map((c, i) => {
      const key = c.key ?? `col_${i}`;
      return {
        ...c,
        key,
        ellipsis: true,
        onHeaderCell: () => ({ id: String(key) }),
        onCell: () => ({ id: String(key) }),
      };
    });
  }, [columns]);

  useEffect(() => setCols(buildColumns), [buildColumns]);

  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableWrapper = tableWrapperRef.current;

    if (!topScroll || !tableWrapper) return;

    const tableContent = tableWrapper.querySelector(".ant-table-content");
    if (!tableContent) return;

    const syncWidth = () => {
      const scrollWidth = tableContent.scrollWidth;
      const topScrollContent = topScroll.querySelector(".top-scroll-content");
      if (topScrollContent) topScrollContent.style.width = `${scrollWidth}px`;
    };

    syncWidth();
    const resizeObserver = new ResizeObserver(syncWidth);
    resizeObserver.observe(tableContent);

    const handleTopScroll = () => { tableContent.scrollLeft = topScroll.scrollLeft; };
    const handleTableScroll = () => { topScroll.scrollLeft = tableContent.scrollLeft; };

    topScroll.addEventListener("scroll", handleTopScroll);
    tableContent.addEventListener("scroll", handleTableScroll);

    return () => {
      resizeObserver.disconnect();
      topScroll.removeEventListener("scroll", handleTopScroll);
      tableContent.removeEventListener("scroll", handleTableScroll);
    };
  }, [cols, data]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 1 } }));

  const onDragEnd = ({ active, over }) => {
    setDragIndex({ active: -1, over: -1 });
    if (!over || active.id === over.id) return;

    setCols((prev) => {
      const previousIndex = prev.findIndex((c) => c.key === active.id);
      const newIndex = prev.findIndex((c) => c.key === over.id);
      if (previousIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, previousIndex, newIndex);
    });
  };

  const onDragOver = (event) => {
    setDragIndex({
      active: event.active.id,
      over: event.over?.id ?? -1,
    });
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
    setCurrentPageSize(pagination.pageSize);
    onTableChange(pagination, filters, sorter);
  };

  const paginationConfig = yescomp
    ? { current: currentPage, pageSize: currentPageSize, total, showSizeChanger: true }
    : { current: currentPage, total, showSizeChanger: false };

  const sortableItems = useMemo(() => cols.map((c) => String(c.key)), [cols]);

  return (
    <div>
      <div
        ref={topScrollRef}
        className="top-scrollbar"
        style={{ overflowX: "auto", overflowY: "hidden", marginBottom: 4 }}
      >
        <div className="top-scroll-content" style={{ height: 1 }} />
      </div>

      <div ref={tableWrapperRef}>
        <DndContext
          sensors={sensors}
          modifiers={[restrictToHorizontalAxis]}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
        >
          <DragIndexContext.Provider value={dragIndex}>
            <SortableContext items={sortableItems} strategy={horizontalListSortingStrategy}>
              <Table
                columns={cols}
                dataSource={data}
                loading={loading}
                onRow={onRow}
                rowClassName={rowClassName}
                onChange={handleTableChange}
                pagination={{
                  ...paginationConfig,
                  position: ["topRight"],
                  size: "small",
                  showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} items`,
                }}
                scroll={{ x: "max-content" }}
                components={{
                  header: { cell: TableHeaderCell },
                  body: { cell: TableBodyCell },
                }}
              />
            </SortableContext>

            <DragOverlay>
              {dragIndex.active !== -1 && (
                <th style={{ padding: 12, background: "#f5f5f5" }}>
                  {cols.find((c) => c.key === dragIndex.active)?.title || null}
                </th>
              )}
            </DragOverlay>
          </DragIndexContext.Provider>
        </DndContext>
      </div>
    </div>
  );
}

export default CommonTable;


