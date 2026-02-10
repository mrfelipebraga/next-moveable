import { deepFlat } from "@daybrush/utils";
import { GroupManager, TargetList } from "@moveable/helper";
import React, { useMemo } from "react";
import { useKeycon } from "react-keycon";
import Moveable, { MoveableTargetGroupsType } from "react-moveable";
import Selecto, { ElementType } from "react-selecto";
import styles from "./page.module.css";

function createBoxes() {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `box-${i}`,
    x: 80 + i * 80,
    y: 80 + (i % 2) * 120,
    width: 80,
    height: 80,
    transform: "translate(0px, 0px)",
  }));
}

export default function Home() {
  const [boxes] = React.useState(() => createBoxes());
  const [groups, setGroups] = React.useState<Map<string, Array<ElementType>>>(new Map());
  const [targets, setTargets] = React.useState<Array<ElementType>>([]);
  const [mounted, setMounted] = React.useState(false);

  const { isKeydown: isCommand } = useKeycon({ keys: "meta" });
  const { isKeydown: isShift } = useKeycon({ keys: "shift" });

  const moveableRef = React.useRef<Moveable>(null);
  const selectoRef = React.useRef<Selecto>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const groupManager = React.useMemo(() => new GroupManager([], []), []);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const setSelectedTargets = React.useCallback((nextTargetes: MoveableTargetGroupsType) => {
    selectoRef.current!.setSelectedTargets(deepFlat(nextTargetes));
    setTargets(nextTargetes as ElementType[]);
  }, []);

  const clearSelection = React.useCallback(() => {
    setTargets([]);
    selectoRef.current?.setSelectedTargets([]);
  }, []);

  const groupSelected = React.useCallback(() => {
    if (targets.length <= 1) return;

    const id = `group-${Date.now()}`;

    const nextGroup = groupManager.group(targets, true);

    setGroups((prev) => {
      const next = new Map(prev);
      next.set(id, targets as Array<HTMLElement>);
      return next;
    });

    setTargets([nextGroup] as unknown as ElementType[]);
  }, [targets, groupManager]);

  const ungroupSelected = React.useCallback(() => {
    const nextTargets = groupManager.ungroup(targets);

    if (!nextTargets?.length) return;

    setGroups((prev) => {
      const next = new Map(prev);

      next.forEach((value, key) => {
        if (value === nextTargets) {
          next.delete(key);
        }
      });

      return next;
    });

    setTargets(nextTargets as ElementType[]);
  }, [targets, groupManager]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // CTRL + G → GROUP
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        groupSelected();
      }

      // CTRL + SHIFT + G → UNGROUP
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        ungroupSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [groupSelected, ungroupSelected]);

  React.useEffect(() => {
    if (!mounted) return;
    const elements = selectoRef.current?.getSelectableElements?.() ?? [];
    groupManager.set([], elements);
  }, [groupManager, mounted]);

  const updateMoveable = React.useCallback(() => {
    requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });
  }, []);

  const guidelines = useMemo(() => {
    let flatted = deepFlat(targets);

    if (!containerRef.current || !flatted.length) return [];

    return Array.from(containerRef.current.querySelectorAll(".targets")).filter(
      (el) => !flatted.includes(el as HTMLElement)
    );
  }, [targets]);

  return (
    <div className={styles.view}>
      <div ref={containerRef} className={styles.container}>
        {containerRef.current && mounted && (
          <>
            <Moveable
              ref={moveableRef}
              draggable={true}
              resizable={true}
              snappable={true}
              origin={false}
              target={targets}
              isDisplayGridGuidelines={true}
              container={containerRef.current}
              rootContainer={containerRef.current}
              elementGuidelines={guidelines}
              snapDirections={{
                top: true,
                left: true,
                bottom: true,
                right: true,
                center: true,
                middle: true,
              }}
              elementSnapDirections={{
                top: true,
                left: true,
                bottom: true,
                right: true,
                center: true,
                middle: true,
              }}
              bounds={{ top: 0, left: 0, bottom: 0, right: 0, position: "css" }}
              onClickGroup={(e) => {
                if (!e.moveableTarget) {
                  setSelectedTargets([]);
                  return;
                }
                if (e.isDouble) {
                  const childs = groupManager.selectSubChilds(targets, e.moveableTarget);
                  setSelectedTargets(childs.targets());
                  return;
                }
                if (e.isTrusted) {
                  selectoRef.current!.clickTarget(e.inputEvent, e.moveableTarget);
                }
              }}
              onDrag={(e) => {
                e.target.style.transform = e.transform;
                updateMoveable();
              }}
              onDragGroup={(e) => {
                e.events.forEach((ev) => {
                  ev.target.style.transform = ev.transform;
                });
                updateMoveable();
              }}
              onResize={(e) => {
                e.target.style.cssText += `width: ${e.width}px; height: ${e.height}px`;
                e.target.style.transform = e.drag.transform;
                updateMoveable();
              }}
              onResizeGroup={({ events }) => {
                events.forEach((ev) => {
                  ev.target.style.width = `${ev.width}px`;
                  ev.target.style.height = `${ev.height}px`;
                  ev.target.style.transform = ev.drag.transform;
                });
                updateMoveable();
              }}
              onRenderGroup={(e) => {
                e.events.forEach((ev) => {
                  ev.target.style.cssText += ev.cssText;
                });
              }}
            />
            <Selecto
              ratio={0}
              hitRate={0}
              ref={selectoRef}
              dragContainer={containerRef.current}
              boundContainer={containerRef.current}
              selectByClick={true}
              selectFromInside={false}
              selectableTargets={[".targets"]}
              toggleContinueSelect={["shift"]}
              onDragStart={(e) => {
                const moveable = moveableRef.current!;
                const target = e.inputEvent.target;

                const flatted = deepFlat(targets);

                if (moveable.isMoveableElement(target) || flatted.some((t) => t === target || t?.contains(target))) {
                  e.stop();
                }
              }}
              onSelectEnd={(e) => {
                const { isDragStartEnd, isClick, added, removed, inputEvent } = e;
                const moveable = moveableRef.current!;

                if (isClick && added.length === 0) {
                  clearSelection();
                  return;
                }

                if (isDragStartEnd) {
                  inputEvent.preventDefault();

                  moveable.waitToChangeTarget().then(() => {
                    moveable.dragStart(inputEvent);
                  });
                }
                let nextChilds: TargetList;

                if (isDragStartEnd || isClick) {
                  if (isCommand) {
                    nextChilds = groupManager.selectSingleChilds(targets, added, removed);
                  } else {
                    nextChilds = groupManager.selectCompletedChilds(targets, added, removed, isShift);
                  }
                } else {
                  nextChilds = groupManager.selectSameDepthChilds(targets, added, removed);
                }
                e.currentTarget.setSelectedTargets(nextChilds.flatten());
                setSelectedTargets(nextChilds.targets());
              }}
            />
          </>
        )}

        {boxes.map((box) => (
          <div
            key={box.id}
            data-id={box.id}
            className={`${styles.cube} targets`}
            style={{ width: box.width, height: box.height, left: box.x, top: box.y }}
          />
        ))}
      </div>
    </div>
  );
}
