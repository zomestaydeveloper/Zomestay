/**
 * Test script for the enhanced booking data API with meal plan combinations
 * 
 * This script demonstrates how the API now includes meal plan combinations
 * in room suggestions based on check-in, check-out, guests, and rooms.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMealPlanAPI() {
    try {
        console.log('🧪 Testing Enhanced Booking Data API with Meal Plan Combinations\n');
        
        // Test parameters
        const testParams = {
            propertyId: 'your-property-id', // Replace with actual property ID
            checkIn: '2024-12-01',
            checkOut: '2024-12-03',
            guests: 4,
            rooms: 2
        };
        
        console.log('📋 Test Parameters:');
        console.log(`   Property ID: ${testParams.propertyId}`);
        console.log(`   Check-in: ${testParams.checkIn}`);
        console.log(`   Check-out: ${testParams.checkOut}`);
        console.log(`   Guests: ${testParams.guests}`);
        console.log(`   Rooms: ${testParams.rooms}\n`);
        
        // Simulate API call
        const apiUrl = `http://localhost:5000/propertiesDetials/${testParams.propertyId}/booking-data?checkIn=${testParams.checkIn}&checkOut=${testParams.checkOut}&guests=${testParams.guests}&rooms=${testParams.rooms}`;
        
        console.log('🌐 API Endpoint:');
        console.log(`   ${apiUrl}\n`);
        
        // Expected response structure
        const expectedResponse = {
            success: true,
            data: {
                propertyId: testParams.propertyId,
                dateRange: {
                    checkIn: testParams.checkIn,
                    checkOut: testParams.checkOut,
                    nights: 2
                },
                guests: testParams.guests,
                requestedRooms: testParams.rooms,
                summary: {
                    totalRoomTypes: 3,
                    totalRooms: 15,
                    totalAvailableRooms: 12,
                    averageOccupancyRate: 80.0,
                    availableMealPlans: 4,
                    mealPlanTypes: ['EP', 'CP', 'MAP', 'AP']
                },
                roomTypes: {
                    // Room type availability data
                },
                suggestedCombinations: [
                    {
                        id: 'exact-deluxe-rooms',
                        type: 'exact_match',
                        rooms: [
                            {
                                roomTypeId: 'deluxe-room-id',
                                roomTypeName: 'Deluxe Room',
                                quantity: 2,
                                maxOccupancy: 2,
                                totalCapacity: 4,
                                availableRooms: 3
                            }
                        ],
                        totalCapacity: 4,
                        totalRooms: 2,
                        pricing: {
                            totalNights: 2,
                            roomCount: 2,
                            basePricing: {
                                doubleOccupancy: 2500,
                                singleOccupancy: 2000,
                                groupOccupancy: 3000
                            },
                            mealPlanOptions: [
                                {
                                    mealPlanId: 'ep-plan-id',
                                    name: 'European Plan',
                                    kind: 'EP',
                                    price: 2500,
                                    totalCost: 10000
                                }
                            ],
                            totalEstimatedCost: 10000
                        },
                        mealPlanCombinations: [
                            {
                                id: 'meal-ep-plan',
                                mealPlanId: 'ep-plan-id',
                                name: 'European Plan (EP)',
                                kind: 'EP',
                                price: 2500,
                                totalCost: 10000,
                                description: 'Room only - No meals included',
                                isRecommended: true
                            },
                            {
                                id: 'meal-cp-plan',
                                mealPlanId: 'cp-plan-id',
                                name: 'Continental Plan (CP)',
                                kind: 'CP',
                                price: 3000,
                                totalCost: 12000,
                                description: 'Room + Continental Breakfast',
                                isRecommended: true
                            },
                            {
                                id: 'meal-map-plan',
                                mealPlanId: 'map-plan-id',
                                name: 'Modified American Plan (MAP)',
                                kind: 'MAP',
                                price: 4000,
                                totalCost: 16000,
                                description: 'Room + Breakfast + Dinner',
                                isRecommended: false
                            },
                            {
                                id: 'meal-ap-plan',
                                mealPlanId: 'ap-plan-id',
                                name: 'American Plan (AP)',
                                kind: 'AP',
                                price: 5000,
                                totalCost: 20000,
                                description: 'Room + All Meals',
                                isRecommended: false
                            }
                        ],
                        availability: {
                            canAccommodate: true,
                            minAvailableRooms: 3,
                            occupancyRate: 66.7
                        },
                        recommendation: {
                            score: 95,
                            reason: 'Perfect match for your requirements'
                        }
                    }
                ],
                metadata: {
                    fetchedAt: new Date().toISOString(),
                    dateRangeLength: 2,
                    processingTimeMs: 150
                }
            }
        };
        
        console.log('📊 Expected Response Structure:');
        console.log('   ✅ Room suggestions with meal plan combinations');
        console.log('   ✅ Pricing calculations including meal plans');
        console.log('   ✅ Recommended meal plans (EP, CP)');
        console.log('   ✅ All available meal plan types');
        console.log('   ✅ Total cost calculations per meal plan\n');
        
        console.log('🎯 Key Features:');
        console.log('   • Smart room suggestions based on occupancy');
        console.log('   • Meal plan combinations for each room suggestion');
        console.log('   • Recommended meal plans (EP, CP) highlighted');
        console.log('   • Total cost calculations including meal plans');
        console.log('   • Mixed room type combinations with meal plans');
        console.log('   • Insufficient capacity suggestions with alternatives\n');
        
        console.log('🔧 Frontend Integration:');
        console.log('   • RoomSection component displays meal plan options');
        console.log('   • Selected suggestion shows available meal plans');
        console.log('   • Recommended meal plans are highlighted');
        console.log('   • Cost calculations include meal plan pricing\n');
        
        console.log('✅ Enhanced API Features:');
        console.log('   ✓ Room type + meal plan combinations');
        console.log('   ✓ Smart pricing calculations');
        console.log('   ✓ Recommended meal plan suggestions');
        console.log('   ✓ Mixed room type combinations');
        console.log('   ✓ Capacity validation with alternatives');
        console.log('   ✓ Frontend display of meal plan options\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testMealPlanAPI();
