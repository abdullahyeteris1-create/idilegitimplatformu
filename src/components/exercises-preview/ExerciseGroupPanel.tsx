"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/student-panel-preview/icons";
import type { PreviewExerciseGroup } from "./exercisePreviewGroups";
import previewStyles from "./exercises-preview.module.css";

export function ExerciseGroupPanel({ group }: { group: PreviewExerciseGroup }) {
  return (
    <section aria-labelledby="preview-group-title">
      <div className={previewStyles.groupHead}>
        <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
          <span className={previewStyles.groupHeadIcon} style={{ "--tone": group.toneColor } as CSSProperties}>
            <Icon name={group.icon} />
          </span>
          <div className={previewStyles.groupHeadText}>
            <h3 id="preview-group-title">{group.title}</h3>
            <p>{group.description}</p>
          </div>
        </div>
        <span className={previewStyles.groupBadge} style={{ "--tone": group.toneColor } as CSSProperties}>
          {group.exercises.length} çalışma
        </span>
      </div>

      <div className={previewStyles.cardGrid}>
        {group.exercises.length === 0 ? (
          <p className={previewStyles.emptyState}>Bu kategoride henüz çalışma bulunmuyor.</p>
        ) : (
          group.exercises.map((exercise) => (
            <article
              key={exercise.slug}
              className={previewStyles.exerciseCard}
              style={{ "--tone": group.toneColor } as CSSProperties}
            >
              <div className={previewStyles.exerciseCardHead}>
                <span className={previewStyles.exerciseIcon}>
                  <Icon name={group.icon} />
                </span>
                <div className={previewStyles.exerciseTags}>
                  {exercise.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <h4>{exercise.title}</h4>
              <p>{exercise.description}</p>
              <Link href={exercise.href}>
                Çalışmaya Başla <Icon name="arrow" />
              </Link>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
