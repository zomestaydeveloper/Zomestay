const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const MealPlanController ={
    // Create a new meal plan
    createMealPlan: async (req, res) => {
        try {
                const { name, description,code, kind , propertyId } = req.body;

                console.log(req.body)
                const newMealPlan = await prisma.mealPlan.create({
                    data: { name, description,  code, kind, propertyId},
                });
                res.status(201).json(newMealPlan);
              
        }catch(error){
            console.error('Error creating meal plan:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    updateMealPlan: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, adult_price, child_price, code, kind } = req.body;
            const updatedMealPlan = await prisma.mealPlan.update({
                where: { id: id},
                data: { name, description, adult_price, child_price, code, kind },
            });
            res.status(200).json(updatedMealPlan);
        } catch (error) {
            console.error('Error updating meal plan:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    getMealPlan: async (req, res) => {
        try {
            const { id } = req.params;  
            const mealPlan = await prisma.mealPlan.findUnique({
                where: { id: parseInt(id) },
            }); 

            if (!mealPlan) {
                return res.status(404).json({ error: 'Meal plan not found' });
            }

            res.status(200).json(mealPlan);
        } catch (error) {
            console.error('Error fetching meal plan:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getMealPlans: async (req, res) => {

        const { propertyId } = req.query;
        try {
            const mealPlans = await prisma.mealPlan.findMany({
                where: {
                    propertyId: propertyId
                }
            });
            res.status(200).json(mealPlans);
        } catch (error) {
            console.error('Error fetching meal plans:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    deleteMealPlan: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedMealPlan = await prisma.mealPlan.delete({
                where: { id: id },
            });
            res.status(200).json(deletedMealPlan);
        }catch(error){
            console.error('Error deleting meal plan:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}


module.exports = MealPlanController;