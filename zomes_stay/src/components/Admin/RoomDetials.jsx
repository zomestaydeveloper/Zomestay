const RoomDetials = ()=>{
    return (
        <div className="border border-gray-300 p-4 shadow rounded flex flex-col gap-2 ">
      <div className="flex flex-col gap-2 ">
        <label className="text-xs text-gray-400">Room name</label>
        <input type="text" className="border border-gray-300 rounded h-[33px]" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400">Room image</label>
        <div className="relative w-full">
          <input type="file" id="fileUpload" className="absolute inset-0 opacity-0 cursor-pointer" />
          <label htmlFor="fileUpload" className="flex items-center justify-center border border-gray-300 text-xs text-gray-400 rounded h-[33px] cursor-pointer">
            Upload Image
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 "> 
        <label className="text-gray-400 text-[12px]">Room Description:</label>
        <textarea className="border rounded text-gray-300"></textarea>
      </div>

      <div className="flex flex-col gap-2 "> 
        <label className="text-gray-400 text-[12px]">Price:</label>
        <input type="number" className="border border-gray-300 rounded h-[33px]" />
      </div>
      
    </div>
    )
}

export default RoomDetials