import Mux from "@mux/mux-node";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const config = {
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
};

const mux = new Mux(config);

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId: userId,
      },
      include: {
        chapters: {
          where: {
            id: params.chapterId,
          },
          include: {
            muxData: true,
          },
        },
      },
    });

    if (!course?.chapters?.length) {
      return new NextResponse("Not found", { status: 404 });
    }

    const chapterToDelete = course.chapters[0]; // Assuming only one chapter matches the ID

    if (chapterToDelete.muxData?.assetId) {
      await mux.video.assets.delete(chapterToDelete.muxData.assetId);

      await db.muxData.delete({
        where: {
          id: chapterToDelete.muxData.id,
        },
      });
    }

    await db.chapter.delete({
      where: {
        id: params.chapterId,
      },
    });

    return NextResponse.json({ message: "Chapter deleted" });
  } catch (error) {
    console.log("[CHAPTER_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    // Validate course and chapter IDs (optional)
    // if (!isValidId(params.courseId) || !isValidId(params.chapterId)) {
    //   return new NextResponse("Invalid course or chapter ID", { status: 400 });
    // }

    const { userId } = auth();
    const { isPublished, ...values } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ownCourse = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId,
      },
    });

    if (!ownCourse) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.update({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
      data: {
        ...values,
      },
    });

    if (values.videoUrl) {
      let existingMuxData;
      try {
        existingMuxData = await db.muxData.findFirst({
          where: {
            chapterId: params.chapterId,
          },
        });
      } catch (error) {
        console.error("Error fetching existing Mux data:", error);
        // Handle error more gracefully (optional)
      }

      if (existingMuxData) {
        try {
          await mux.video.assets.delete(existingMuxData.assetId);
        } catch (error) {
          console.error("Mux Asset Deletion Error:", error);
          // Handle Mux error more gracefully (optional)
        }

        await db.muxData.delete({
          where: {
            id: existingMuxData.id,
          },
        });
      }

      const asset = await mux.video.assets.create({
        input: values.videoUrl,
        playback_policy: [],
        test: false,
      });

      await db.muxData.create({
        data: {
          chapterId: params.chapterId,
          assetId: asset.id,
          playbackId: asset.playback_ids?.[0]?.id,
        },
      });
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.log("[CHAPTER_ID_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
