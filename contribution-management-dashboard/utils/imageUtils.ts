/**
 * Compresses an image File using HTML Canvas and returns a data URL.
 * Resizes large images to max dimensions and converts them to JPEG format,
 * reducing payload size from ~10MB+ down to ~100-300KB.
 */
export const compressImageFile = (
    file: File,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85
): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) {
                reject(new Error('Failed to read image file.'));
                return;
            }

            // Fall back to uncompressed dataUrl if mime type is non-standard or missing
            if (!file.type || !file.type.startsWith('image/')) {
                resolve(dataUrl);
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        if (width / height > maxWidth / maxHeight) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(dataUrl);
                        return;
                    }

                    // Draw white background for transparent PNGs converted to JPEG
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                } catch (err) {
                    resolve(dataUrl);
                }
            };

            img.onerror = () => {
                // Fallback to original read result if image element fails
                resolve(dataUrl);
            };

            img.src = dataUrl;
        };

        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};

/**
 * Checks if a URL points to a video file based on file extension.
 */
export const isVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(cleanUrl);
};

/**
 * Returns an optimized image URL.
 * Supports Cloudflare R2 URLs, legacy Cloudinary URLs with transformations,
 * and direct/base64 URLs.
 */
export const getOptimizedImageUrl = (
    url: string | null | undefined,
    transformation = 'f_auto,q_auto'
): string => {
    if (!url) return '';
    // If legacy Cloudinary upload URL
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        // Prevent double transformations
        if (url.includes(`/upload/${transformation}/`) || url.includes('/upload/c_') || url.includes('/upload/w_') || url.includes('/upload/f_')) {
            return url;
        }
        return url.replace('/upload/', `/upload/${transformation}/`);
    }
    // For Cloudflare R2 or direct URLs, return as is
    return url;
};

/**
 * Generates an optimized thumbnail URL for grid views.
 */
export const getThumbnailImageUrl = (
    url: string | null | undefined,
    width = 500,
    height = 500
): string => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return getOptimizedImageUrl(url, `w_${width},h_${height},c_fill,f_auto,q_auto`);
    }
    return url;
};
