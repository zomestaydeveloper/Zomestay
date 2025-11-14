import img1 from "../assets/banners/1b6d1e7b93df1bfb92eedff58a32d2e265408692.png";


const AboutUs =()=>{
    return(

         <div className=" w-full flex flex-col md:flex-row justify-between gap-4  px-4 md:px-16 py-8">
                    <div className="w-full md:w-[60%] flex flex-col gap-4">
                     <h1 className="font-bold text-[18px] lg:text-[36px] text-[#484848]">Discover More About  <br></br>Zomestay</h1>  
                     <hr className="h-2 w-40 bg-blue-800 border-0 rounded" />
                     <p className="text-gray-500 text-[14px] lg:text-[14px]">Zomestay isn't a widely recognized brand or term, so I couldn’t find any reliable information about a company or concept by that name. If you’re referring to something specific—like a travel service, startup, or homestay platform—could you share a bit more context or clarify what “Zomestay” is? That would help me find the right information or craft a tailored description for you.</p>  
                     <div className="flex flex-row gap-4">
                       <h1 className="text-[#484848] text-[15px] font-bold">Ask A Question</h1>
                       <h1 className="text-[#484848] text-[15px]  font-bold">Find A Property</h1>
                     </div>
                     <button className="bg-[#004AAD] text-white h-[40px] w-[120px] text-xs rounded-2xl"> Discover More</button>
                       
                   </div>    
                    <div className="w-full md:w-[40%]  flex  md:justify-end justify-center">
                       <img src={img1} alt="" className="w-full md:w-[400px] h-[400px] object-cover rounded-2xl" />
                    </div>
                       
                    </div>
    )
}

export default AboutUs