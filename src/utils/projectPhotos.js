const parseJsonString = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (!looksLikeJson) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const getFallbackName = (url, index) => {
  if (typeof url !== 'string') return `File ${index + 1}`;
  return url.startsWith('data:application/pdf') ? `File ${index + 1}.pdf` : `Photo ${index + 1}`;
};

const inferType = (photo) => {
  const explicitType = typeof photo?.type === 'string' ? photo.type.toLowerCase() : '';
  if (explicitType === 'pdf' || explicitType === 'image') return explicitType;

  const name = typeof photo?.name === 'string' ? photo.name.toLowerCase() : '';
  const url = typeof photo?.url === 'string' ? photo.url.toLowerCase() : '';

  if (name.endsWith('.pdf') || url.startsWith('data:application/pdf')) {
    return 'pdf';
  }

  return 'image';
};

const normalizePhotoObject = (photo, index) => {
  if (!photo || typeof photo !== 'object') return null;

  const url = typeof photo.url === 'string' ? photo.url : null;
  if (!url) return null;

  return {
    ...photo,
    id: String(photo.id ?? photo.createdAt ?? photo.name ?? `legacy-${index}`),
    name: typeof photo.name === 'string' && photo.name.trim()
      ? photo.name
      : getFallbackName(url, index),
    type: inferType(photo)
  };
};

export const normalizeProjectPhotos = (rawPhotos) => {
  const parsedPhotos = parseJsonString(rawPhotos);

  if (Array.isArray(parsedPhotos)) {
    return parsedPhotos
      .map((photo, index) => {
        const parsedPhoto = parseJsonString(photo);

        if (typeof parsedPhoto === 'string') {
          return normalizePhotoObject({
            id: `legacy-${index}`,
            url: parsedPhoto,
            name: getFallbackName(parsedPhoto, index)
          }, index);
        }

        return normalizePhotoObject(parsedPhoto, index);
      })
      .filter(Boolean);
  }

  const singlePhoto = normalizePhotoObject(parsedPhotos, 0);
  return singlePhoto ? [singlePhoto] : [];
};
