all:
	gcc shovel.c `js-config --cflags --libs` -o shovel -O3 -Werror -Wunused

run:
	LD_LIBRARY_PATH=/usr/local/lib ./shovel '../../../oftnbot-utils.js'

debug:
	LD_LIBRARY_PATH=/usr/local/lib gdb ./shovel
