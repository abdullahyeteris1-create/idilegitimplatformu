"use client";

import type { CSSProperties } from "react";
import { Icon } from "@/components/student-panel-preview/icons";
import type { PreviewExerciseGroup } from "./exercisePreviewGroups";
import previewStyles from "./exercises-preview.module.css";

type CategoryCardsProps = {
  groups: PreviewExerciseGroup[];
  activeGroupId: string;
  onSelect: (groupId: string) => void;
};

export function CategoryCards({ groups, activeGroupId, onSelect }: CategoryCardsProps) {
  return (
    <div className={previewStyles.categoryCardGrid} role="tablist" aria-label="Egzersiz kategorileri">
      {groups.map((group) => {
        const isActive = group.id === activeGroupId;
        const exampleTags = group.exercises.slice(0, 4);

        return (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(group.id)}
            className={`${previewStyles.categoryCard} ${isActive ? previewStyles.categoryCardActive : ""}`}
            style={{ "--tone": group.toneColor } as CSSProperties}
          >
            <div className={previewStyles.categoryCardHead}>
              <span className={previewStyles.categoryCardIcon}>
                <Icon name={group.icon} />
              </span>
              <span className={previewStyles.categoryCardCount}>{group.exercises.length} çalışma</span>
            </div>

            <h4>{group.title}</h4>

            {exampleTags.length > 0 && (
              <div className={previewStyles.categoryCardTags}>
                {exampleTags.map((exercise) => (
                  <span key={exercise.slug}>{exercise.title}</span>
                ))}
              </div>
            )}

            <span className={previewStyles.categoryCardFooter}>
              {isActive ? "Devam Et" : "Görüntüle"}
              <Icon name="arrow" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
