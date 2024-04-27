const { PrismaClient } = require("@prisma/client");

const database = new PrismaClient();

async function main() {
  try {
    const categoryNames = [
      "Computer Science",
      "Music",
      "Fitness",
      "Photography",
      "Accounting",
      "Engineering",
    ];
    const uniqueCategories = categoryNames.map((name) => ({
      name: `${name} Course`,
    })); // Add a suffix for uniqueness

    await database.category.createMany({
      data: uniqueCategories,
    });

    console.log("Success");
  } catch (error) {
    console.log("Error seeding the database categories", error);
  } finally {
    await database.$disconnect();
  }
}

main();
