import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader,
  Plus,
  Camera,
  ScanSearch,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  onImagesSelected: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
  "image/*": [".jpeg", ".jpg", ".png", ".webp"],
};

export const MultiImageUpload: React.FC<Props> = ({
  onImagesSelected,
  maxImages = 3,
  disabled = false,
}) => {
  const [images, setImages] = useState<
    Array<{ id: string; data: string; name: string }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (
    file: File,
  ): Promise<{ id: string; data: string; name: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          data: reader.result as string,
          name: file.name,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (disabled) return;

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          const error = errors[0];
          if (error.code === "file-too-large") {
            toast.error(`${file.name} is too large. Max size is 10MB`);
          } else {
            toast.error(`${file.name} is not a valid image`);
          }
        });
        return;
      }

      // Check if adding these would exceed max
      const remainingSlots = maxImages - images.length;
      if (acceptedFiles.length > remainingSlots) {
        toast(
          `You can only upload up to ${maxImages} images. Only the first ${remainingSlots} will be added.`,
        );
        acceptedFiles = acceptedFiles.slice(0, remainingSlots);
      }

      if (acceptedFiles.length === 0) return;

      setIsProcessing(true);

      try {
        const newImages = await Promise.all(acceptedFiles.map(processFile));
        setImages((prev) => {
          const updated = [...prev, ...newImages];
          onImagesSelected(updated.map((img) => img.data));
          return updated;
        });
        toast.success(`${newImages.length} image(s) added`);
      } catch (error) {
        toast.error("Failed to process images");
      } finally {
        setIsProcessing(false);
      }
    },
    [images.length, maxImages, disabled, onImagesSelected],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: disabled || images.length >= maxImages || isProcessing,
    onDrop,
    noClick: images.length > 0, // Only click to add when empty
    noKeyboard: images.length > 0,
  });

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      onImagesSelected(updated.map((img) => img.data));
      return updated;
    });
  };

  const canAddMore = images.length < maxImages && !disabled && !isProcessing;

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="aspect-square rounded-xl overflow-hidden border-2 border-[#63A361]/30 bg-[#FDFCF8]">
                  <img
                    src={image.data}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                  {/* Remove button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    disabled={disabled}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Image number badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-[#63A361] text-white text-xs font-bold rounded-lg">
                    #{index + 1}
                  </div>

                  {/* Success indicator */}
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-[#63A361] text-white rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#5B532C]/60 text-center truncate px-2">
                  {image.name}
                </p>
              </motion.div>
            ))}

            {/* Add more placeholder */}
            {canAddMore && (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={open}
                className="aspect-square rounded-xl border-2 border-dashed border-[#63A361]/30 bg-[#FDE7B3]/10 flex flex-col items-center justify-center gap-2 hover:border-[#63A361] hover:bg-[#63A361]/5 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-[#63A361]/10 flex items-center justify-center group-hover:bg-[#63A361]/20 transition-colors">
                  <Plus className="w-6 h-6 text-[#63A361]" />
                </div>
                <span className="text-sm font-medium text-[#63A361]">
                  Add Image
                </span>
                <span className="text-xs text-[#5B532C]/40">
                  {images.length} of {maxImages}
                </span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropzone - Show when no images or as additional drop area */}
      {images.length === 0 && (
        <div
          {...getRootProps()}
          className={`
            relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer
            ${
              isDragActive
                ? "border-[#63A361] bg-[#63A361]/5"
                : "border-[#5B532C]/20 bg-[#FDE7B3]/10 hover:border-[#63A361]/40"
            }
            ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />

          <div className="text-center">
            <motion.div
              className={`
                w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center
                ${isDragActive ? "bg-[#63A361]" : "bg-[#63A361]/10"}
              `}
              animate={isProcessing ? { rotate: 360 } : {}}
              transition={
                isProcessing
                  ? { duration: 1, repeat: Infinity, ease: "linear" }
                  : {}
              }
            >
              {isProcessing ? (
                <Loader className="w-8 h-8 text-[#63A361]" />
              ) : isDragActive ? (
                <Upload className="w-8 h-8 text-white" />
              ) : (
                <Camera className="w-8 h-8 text-[#63A361]" />
              )}
            </motion.div>

            <h3 className="text-lg font-semibold text-[#5B532C] mb-2">
              {isDragActive ? "Drop images here" : "Upload Images for Analysis"}
            </h3>
            <p className="text-sm text-[#5B532C]/60 mb-4">
              Drag & drop up to {maxImages} images, or click to browse
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#63A361]/10 text-[#63A361]">
                <ScanSearch className="w-3 h-3 inline mr-1" />
                Multi-angle analysis
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FDE7B3]/50 text-[#5B532C]">
                <ImageIcon className="w-3 h-3 inline mr-1" />
                Max {maxImages} images
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                Max 10MB each
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info bar when images are present */}
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-[#63A361]/5 rounded-xl border border-[#63A361]/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#63A361]/10 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#63A361]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5B532C]">
                {images.length} image{images.length !== 1 ? "s" : ""} selected
              </p>
              <p className="text-xs text-[#5B532C]/50">
                Multi-image analysis provides more accurate results
              </p>
            </div>
          </div>

          {images.length < maxImages && (
            <button
              onClick={open}
              disabled={disabled || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-[#63A361] text-white rounded-lg text-sm font-medium hover:bg-[#4a8a4d] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add More
            </button>
          )}
        </motion.div>
      )}

      {/* Warning for max images */}
      {images.length >= maxImages && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 bg-[#FFC50F]/10 rounded-xl border border-[#FFC50F]/30"
        >
          <AlertTriangle className="w-5 h-5 text-[#FFC50F]" />
          <p className="text-sm text-[#5B532C]">
            Maximum {maxImages} images allowed. Remove an image to add more.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default MultiImageUpload;
