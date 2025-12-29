import { Camera, X } from "lucide-react";
import { mediaService } from "../../../../services";

const MediaUploadSection = ({
  isEdit,
  existingMedia,
  mediaFiles,
  coverSelection,
  errors,
  mediaRef,
  handleMediaChange,
  handleExistingPropertyMediaRemove,
  handleExistingPropertyMediaSetCover,
  handleRemoveNewPropertyImage,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center">
          <Camera className="h-4 w-4 mr-2 text-blue-600" />
          Property Images (16:9 aspect ratio, max 2MB each, up to 12 images)
        </h2>
      </div>
      <div className="p-6">
        {isEdit && existingMedia.some((mediaItem) => !mediaItem.isDeleted) && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Existing Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {existingMedia.map((mediaItem, index) => {
                if (mediaItem.isDeleted) {
                  return null;
                }
                const isCover =
                  coverSelection?.type === 'existing'
                    ? coverSelection.index === index
                    : mediaItem.isFeatured;
                return (
                  <div
                    key={mediaItem.id || mediaItem.url || index}
                    className="relative border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <img
                      src={mediaService.getMedia(mediaItem.url)}
                      alt={`Existing media ${index + 1}`}
                      className="w-full h-32 object-cover bg-gray-100"
                    />
                    <div className="absolute inset-0 flex flex-col justify-between p-2">
                      <div className="flex justify-between items-start">
                        {isCover && (
                          <span className="px-2 py-1 text-[10px] font-semibold bg-blue-600 text-white rounded-full uppercase tracking-wide">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleExistingPropertyMediaRemove(index)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleExistingPropertyMediaSetCover(index)}
                          className="self-center px-2 py-0.5 text-[10px] font-semibold bg-white/80 text-gray-700 rounded hover:bg-white"
                        >
                          Set Cover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <input
            ref={mediaRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleMediaChange}
            className="block w-full text-xs text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-xs file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {mediaFiles.map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNewPropertyImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {errors.media && <p className="text-red-500 text-xs mt-1">{errors.media}</p>}
        {isEdit && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Update Media"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaUploadSection;

