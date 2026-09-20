from rembg import remove
from PIL import Image
import os
from pathlib import Path

def remove_background(input_path: Path, output_path: Path):
    """1枚の画像の背景を透過にする"""
    print(f"処理中: {input_path.name}")
    try:
        with Image.open(input_path) as img:
            result = remove(img)
            result.save(output_path, "PNG")
        print(f"完了 → {output_path.name}")
    except Exception as e:
        print(f"エラー ({input_path.name}): {e}")


def main():
    # スクリプトがあるディレクトリを対象にする
    current_dir = Path(__file__).parent.resolve()

    # 対象拡張子
    extensions = {'.jpg', '.jpeg', '.png'}

    # 処理対象のファイルを収集
    # ・拡張子が jpg/jpeg/png
    # ・ファイル名が output_ で始まらないもの
    target_files = [
        f for f in current_dir.iterdir()
        if f.is_file()
        and f.suffix.lower() in extensions
        and not f.name.lower().startswith("output_")
    ]

    if not target_files:
        print("処理対象の画像が見つかりませんでした。")
        return

    print(f"処理対象: {len(target_files)} 件")
    print("-" * 40)

    for input_path in target_files:
        # 出力ファイル名: output_元のファイル名.png
        output_name = f"output_{input_path.stem}.png"
        output_path = current_dir / output_name

        # すでに同名の出力ファイルがある場合は上書きしない（必要ならコメントアウト）
        if output_path.exists():
            print(f"スキップ（既に存在）: {output_name}")
            continue

        remove_background(input_path, output_path)

    print("-" * 40)
    print("すべての処理が完了しました。")


if __name__ == "__main__":
    main()