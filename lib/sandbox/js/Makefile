all:
	gcc shovel.c `js-config --cflags --libs` -o shovel.bin -O3 -Werror -Wunused

test:
	LD_LIBRARY_PATH=/usr/local/lib ./shovel '../../../oftnbot-utils.js'

debug:
	LD_LIBRARY_PATH=/usr/local/lib gdb ./shovel

clean:
	rm -rfv shovel.bin
