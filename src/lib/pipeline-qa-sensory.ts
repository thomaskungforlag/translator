import type { QAFinding } from '@/lib/domain';

function buildImageDriftEarsStungFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/tuyas\s+oron\s+skar|tuyas\s+o?ron\s+skar/i.test(sourceText)) {
    return null;
  }

  if (/ears\s+stung/i.test(finalText)) {
    return {
      id: `qa-image-${segmentIndex}-${sourceText.length}-ears-stung`,
      severity: 'warning',
      category: 'image_drift',
      sourceExcerpt: "Tuya's ears stung ...",
      targetExcerpt: "Tuya's ears stung ...",
      issue:
        'The sensory image is softened; "stung" weakens the sharp physical shock in the source.',
      suggestion: 'Use a sharper sensory rendering, e.g. "The sound cut through Tuya\'s ears ..."',
      resolved: false,
    };
  }

  return null;
}

function buildImageDriftEarsRangFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/tuyas\s+oron\s+skar|tuyas\s+o?ron\s+skar/i.test(sourceText)) {
    return null;
  }

  if (!/ears\s+rang/i.test(finalText)) {
    return null;
  }

  return {
    id: `qa-image-${segmentIndex}-${sourceText.length}-ears-rang`,
    severity: 'info',
    category: 'image_drift',
    sourceExcerpt: "Tuya's ears rang ...",
    targetExcerpt: "Tuya's ears rang ...",
    issue:
      'The rendering is acceptable but may still blunt the source image; review whether a sharper phrasing is needed.',
    suggestion: 'Consider a sharper sensory option if context supports it.',
    resolved: false,
  };
}

function buildImageDriftBareLegsFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/smekte\s+hennes\s+nakna\s+ben/i.test(sourceText)) {
    return null;
  }

  if (!/caressed\s+her\s+bare\s+legs/i.test(finalText)) {
    return null;
  }

  return {
    id: `qa-image-${segmentIndex}-${sourceText.length}-caressed`,
    severity: 'warning',
    category: 'image_drift',
    sourceExcerpt: 'smekte hennes nakna ben',
    targetExcerpt: 'caressed her bare legs',
    issue: 'The verb reads more sensual than the source image in this context.',
    suggestion: 'Prefer "brushed her bare legs" or "brushed against her bare legs."',
    resolved: false,
  };
}

function buildImageDriftBoldFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/bold/i.test(sourceText)) {
    return null;
  }

  if (/On\s+a\s+hill\s+Uncle\s+Bold\s+bathed\s+in/i.test(finalText)) {
    return {
      id: `qa-image-${segmentIndex}-${sourceText.length}-bold-bathed`,
      severity: 'warning',
      category: 'image_drift',
      targetExcerpt: 'On a hill Uncle Bold bathed in ...',
      issue: 'The image grammar is awkward and weakens the still visual framing.',
      suggestion: 'Use "On a hill, Uncle Bold stood bathed in ..." for image stability.',
      resolved: false,
    };
  }

  if (/statlig\.\s+oradd\./i.test(sourceText) && /proud\.\s+unafraid\./i.test(finalText)) {
    return {
      id: `qa-image-${segmentIndex}-${sourceText.length}-majestic`,
      severity: 'warning',
      category: 'image_drift',
      sourceExcerpt: 'Statlig. Oradd.',
      targetExcerpt: 'Proud. Unafraid.',
      issue: 'The image loses force and tonal elevation compared with the source.',
      suggestion:
        'Prefer "Majestic. Fearless." unless context clearly requires another equivalent.',
      resolved: false,
    };
  }

  return null;
}

function buildMotionImageDriftFinding(
  _sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/\bpulled\s+him,/i.test(finalText)) {
    return null;
  }

  return {
    id: `qa-motion-${segmentIndex}-${finalText.length}`,
    severity: 'warning',
    category: 'motion_image_drift',
    targetExcerpt: 'pulled him,',
    issue: 'Movement loses directional continuity and reads abruptly clipped.',
    suggestion: 'Prefer "pulled him along," to preserve directional motion.',
    resolved: false,
  };
}

function buildEmotionalIntensityDriftFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/utan\s+ljud|inget\s+ljud|inga\s+ljud|inga\s+ord/i.test(sourceText)) {
    return null;
  }

  if (!/\bcalled\s+out\s+desperately\b/i.test(finalText)) {
    return null;
  }

  return {
    id: `qa-emotion-${segmentIndex}-${sourceText.length}`,
    severity: 'warning',
    category: 'emotional_intensity_drift',
    targetExcerpt: 'called out desperately',
    issue: 'Verb choice underplays emotional urgency in close perspective.',
    suggestion: 'Prefer "cried out desperately" where force should remain high.',
    resolved: false,
  };
}

export function buildSensorySegmentQaFindings(
  sourceText: string,
  finalText: string,
  segmentIndex = 0,
): QAFinding[] {
  return [
    buildImageDriftEarsStungFinding(sourceText, finalText, segmentIndex),
    buildImageDriftEarsRangFinding(sourceText, finalText, segmentIndex),
    buildImageDriftBareLegsFinding(sourceText, finalText, segmentIndex),
    buildImageDriftBoldFinding(sourceText, finalText, segmentIndex),
    buildMotionImageDriftFinding(sourceText, finalText, segmentIndex),
    buildEmotionalIntensityDriftFinding(sourceText, finalText, segmentIndex),
  ].filter((finding): finding is QAFinding => finding !== null);
}
